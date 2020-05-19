import os, platform, subprocess, signal, sys, time

clock = time.time()

try:
    child = subprocess.run(sys.argv[1:])
    code = child.returncode
except KeyboardInterrupt:
    code = -2
except Exception as e:
    print(e)
    code = 1

if code >= 0:
    print('\nProcess returned {0} (0x{0:X})\texecution time : {1:.3f} s'.format(code, time.time() - clock))
else:
    try:
        print('\nProcess terminated by signal {} ({})'.format(-code, signal.Signals(-code).name))
    except:
        print('\nProcess terminated by signal {}'.format(-code))

try:
    if platform.system() == 'Windows':
        os.system('PAUSE')
    else:
        subprocess.run(['bash', '-c', 'read -n 1 -s -r -p "Press any key to continue..."'])
except:
    pass
