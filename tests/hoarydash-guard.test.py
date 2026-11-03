import importlib.util
from pathlib import Path
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread

spec = importlib.util.spec_from_file_location('guard', Path(__file__).parents[1]/'examples/recovery/hoarydash-guard.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

class GuardTest(unittest.TestCase):
    def test_outage_waits_for_core_and_two_failures(self):
        p=g.Policy()
        for t in range(0,300,30): self.assertEqual(p.tick(t,False,False),'waiting_for_core')
        self.assertEqual(p.tick(300,False,True),'confirming_failure')
        self.assertEqual(p.tick(330,False,True),'restart')
        self.assertEqual(p.tick(360,True,True),'healthy')
        self.assertEqual(p.tick(390,True,True),'healthy')
        self.assertEqual(p.attempts,[330])
    def test_cooldown_limit_survives_restart(self):
        p=g.Policy([100,400,700])
        p.tick(750,False,True)
        self.assertEqual(p.tick(780,False,True),'rate_limited')
        self.assertEqual(p.tick(3800,False,True),'restart')
        self.assertEqual(p.tick(3830,False,True),'confirming_failure')
        self.assertEqual(p.tick(3860,False,True),'rate_limited')
        p=g.Policy([3800]);p.tick(3830,False,True)
        self.assertEqual(p.tick(3860,False,True),'cooldown')
    def test_real_http(self):
        class Handler(BaseHTTPRequestHandler):
            def do_HEAD(self):
                self.send_response(200 if self.path=='/ok/' else 404);self.end_headers()
            def log_message(self,*args): pass
        server=HTTPServer(('127.0.0.1',0),Handler)
        thread=Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            base='http://127.0.0.1:'+str(server.server_port)
            self.assertEqual(g.status(base+'/ok/'),200)
            self.assertEqual(g.status(base+'/broken/'),404)
        finally: server.shutdown();server.server_close();thread.join()

unittest.main()
