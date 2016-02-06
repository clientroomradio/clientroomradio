#

from subprocess import call
import os

def create(size):
    do_create(size, True)
    do_create(size, False)

def do_create(size, alpha):
    args = []
    args.extend(["convert",
        "-density", "300",
        "-colorspace", "sRGB",
        "crr_logo.eps",
        "-resize", str(size) + "x" + str(size)])

    if alpha:
        args.extend(["-background", "none"])

    args.extend(["-gravity", "center",
        "-extent", str(size) + "x" + str(size)])

    if alpha:
        args.extend(["gen/crr_" + str(size) + "_alpha.png"])
    else:
        args.extend(["gen/crr_" + str(size) + ".png"])

    call(args)

if not os.path.exists("gen"):
    os.makedirs("gen")

sizes = [29, 40, 50, 57, 58, 72, 76, 80, 100, 114, 120, 144, 152, 192, 300, 512]

for size in sizes:
    create(size)
