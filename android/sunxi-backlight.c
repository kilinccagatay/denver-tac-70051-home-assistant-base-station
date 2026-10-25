#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>

/* Allwinner sun5i display commands used by this tablet's lights HAL. */
#define DISP_CMD_LCD_ON 0x140
#define DISP_CMD_LCD_OFF 0x141
#define DISP_CMD_LCD_SET_BRIGHTNESS 0x142

int main(int argc, char **argv) {
    unsigned long args[4] = {0, 0, 0, 0};
    unsigned long command = DISP_CMD_LCD_SET_BRIGHTNESS;
    char *end = NULL;
    long level = 0;
    int fd;

    if (argc != 2) {
        fprintf(stderr, "usage: %s <0-255|on|off>\n", argv[0]);
        return 2;
    }

    if (!strcmp(argv[1], "on")) {
        command = DISP_CMD_LCD_ON;
    } else if (!strcmp(argv[1], "off")) {
        command = DISP_CMD_LCD_OFF;
    } else {
        errno = 0;
        level = strtol(argv[1], &end, 10);
        if (errno || !end || *end || level < 0 || level > 255) {
            fprintf(stderr, "invalid brightness: %s\n", argv[1]);
            return 2;
        }
    }

    fd = open("/dev/disp", O_RDWR);
    if (fd < 0) {
        perror("open /dev/disp");
        return 1;
    }

    args[1] = (unsigned long)level;
    if (ioctl(fd, command, args) < 0) {
        perror("ioctl display command");
        close(fd);
        return 1;
    }

    close(fd);
    return 0;
}
