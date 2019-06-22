import os, platform, subprocess, sys, time

clock = time.time()
child = subprocess.run(sys.argv[1:])

print('\nProcess returned {0} (0x{0:X})\texecution time : {1:.3f} s'.format(child.returncode, time.time() - clock))
if platform.system() == 'Windows':
    os.system('PAUSE')
else:
    subprocess.run(['bash', '-c', 'read -n 1 -s -r -p \'Press any key to continue...\''])
