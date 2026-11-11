#!/usr/bin/env python3
"""Bounded HoaryDash recovery in the existing SSH app; no public listener."""
import fcntl
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request


def status(url, method='HEAD', token=None):
    headers = {'Authorization': 'Bearer ' + token} if token else {}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers, method=method), timeout=5) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code
    except (OSError, urllib.error.URLError):
        return 0


class Policy:
    def __init__(self, attempts=()):
        self.attempts = list(attempts)
        self.failures = 0

    def tick(self, now, healthy, core_ready):
        self.attempts = [t for t in self.attempts if 0 <= now-t < 3600]
        if healthy:
            self.failures = 0
            return 'healthy'
        if not core_ready:
            self.failures = 0
            return 'waiting_for_core'
        self.failures += 1
        if self.failures < 2:
            return 'confirming_failure'
        if len(self.attempts) >= 3:
            return 'rate_limited'
        if self.attempts and now-self.attempts[-1] < 300:
            return 'cooldown'
        self.attempts.append(now)
        self.failures = 0
        return 'restart'


def main():
    config_path = Path(sys.argv[1])
    config = json.loads(config_path.read_text())
    directory = config_path.parent
    lock = (directory/'guard.lock').open('w')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return
    token = os.environ['SUPERVISOR_TOKEN']  # Never persisted or logged.
    log = logging.getLogger('hoarydash-guard')
    log.setLevel(logging.INFO)
    handler = RotatingFileHandler(directory/'guard.log', maxBytes=65536, backupCount=1)
    handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'))
    log.addHandler(handler)
    state_path = directory/'guard-state.json'
    try:
        policy = Policy(json.loads(state_path.read_text()).get('attempts', []))
    except (OSError, ValueError):
        policy = Policy()
    previous = None
    log.info('started')
    while True:
        try:
            codes = [status(url) for url in config['urls']]
            healthy = all(code == 200 for code in codes)
            ready = healthy or status('http://supervisor/core/api/', 'GET', token) == 200
            action = policy.tick(time.time(), healthy, ready)
            if action != previous:
                log.info('state=%s http=%s', action, codes)
                previous = action
            if action == 'restart':
                # Persist BEFORE the request, including failed attempts, to bound loops.
                temporary = state_path.with_suffix('.tmp')
                temporary.write_text(json.dumps({'attempts': policy.attempts}))
                temporary.chmod(0o600)
                temporary.replace(state_path)
                url = 'http://supervisor/addons/' + config['addon'] + '/restart'
                result = status(url, 'POST', token)
                log.info('hoarydash_restart_http=%s', result)
        except Exception as error:
            # No exception text: URLs/credentials must not enter diagnostics.
            log.error('iteration_error=%s', type(error).__name__)
        time.sleep(30)


if __name__ == '__main__':
    main()
