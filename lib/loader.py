import os, platform, subprocess, sys, time

clock = time.time()

try:
    child = subprocess.run(sys.argv[1:])
    code = child.returncode
except KeyboardInterrupt:
    code = -2

if code >= 0:
    print('\nProcess returned {0} (0x{0:X})\texecution time : {1:.3f} s'.format(code, time.time() - clock))
else:
    signal = [
        "", "SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT",
        "SIGBUS", "SIGFPE", "SIGKILL", "SIGUSR1", "SIGSEGV", "SIGUSR2",
        "SIGPIPE", "SIGALRM", "SIGTERM", "SIGSTKFLT", "SIGCHLD", "SIGCONT",
        "SIGSTOP", "SIGTSTP", "SIGTTIN", "SIGTTOU", "SIGURG", "SIGXCPU",
        "SIGXFSZ", "SIGVTALRM", "SIGPROF", "SIGWINCH", "SIGIO", "SIGPWR",
        "SIGSYS"
    ][-code]
    print('\nProcess terminated by signal {} ({})'.format(-code, signal))

if platform.system() == 'Windows':
    os.system('PAUSE')
else:
    subprocess.run(['bash', '-c', 'read -n 1 -s -r -p "Press any key to continue..."'])
