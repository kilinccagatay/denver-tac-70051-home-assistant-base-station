# Allwinner battery design-capacity calibration

This procedure changes the capacity value Android uses for reporting. It does **not** increase real battery capacity, charge current, runtime, or safety.

The tested device uses six similar 1750 mAh 18650 cells connected as a protected 1S6P pack. The nominal sum is 10,500 mAh; the firmware value was set conservatively to 10,000 mAh. Do not use this value for a different pack.

## Safety first

- Use only cells suitable for parallel connection and bring them to nearly equal voltage before connecting them.
- Use a correct 1S BMS/protection arrangement and appropriate fusing.
- Confirm the tablet charges a 1S lithium pack to the correct voltage.
- Never feed USB 5 V into the battery terminals.
- Stop if any cell becomes hot, swollen, damaged, or imbalanced.
- Keep a restorable image of the relevant boot partition before editing it.

Changing a number in firmware cannot make unsafe battery wiring safe.

## Where the value lives

On this firmware, the FAT boot partition is exposed as `/dev/block/nanda` and contains both `script.bin` and `script0.bin`. The Allwinner configuration section is:

```ini
[pmu_para]
pmu_battery_cap = 2600
```

Your partition name and file set may differ. Do not assume `/dev/block/nanda` on another device.

## Safe workflow

1. Make a raw backup of the entire boot partition and copy it off the tablet.
2. Mount or extract a **copy** of that partition.
3. Use `sunxi-fexc` from [linux-sunxi tools](https://github.com/linux-sunxi/sunxi-tools) to convert each FEX binary to text.
4. Change only `pmu_battery_cap` inside `[pmu_para]`.
5. Recompile to a new binary; do not overwrite the original yet.
6. Decompile the new binary again and diff it against the intended text.
7. Update both `script.bin` and `script0.bin` if both existed and matched on the original partition.
8. Verify file sizes, checksums, and the partition image before writing it back.
9. Reboot with a recovery method available.

Example conversion commands on copied files:

```sh
sunxi-fexc -I bin -O fex script.bin > script.fex
cp script.fex script-10000.fex
# Edit only pmu_battery_cap in script-10000.fex.
sunxi-fexc -I fex -O bin script-10000.fex > script-10000.bin
sunxi-fexc -I bin -O fex script-10000.bin > script-10000.verify.fex
diff -u script-10000.fex script-10000.verify.fex
```

Use [`../tools/patch-script-bin.sh`](../tools/patch-script-bin.sh) to perform the text replacement and round-trip verification on a copied `script.bin`. The tool refuses to overwrite an existing output file.

## Verification on Android

After a successful reboot, this firmware exposes the design value through the power-supply sysfs tree. Locate the actual battery directory first instead of copying a path blindly:

```sh
adb shell 'for d in /sys/class/power_supply/*; do echo "$d"; ls "$d"; done'
```

Then read the available design-capacity entry. On the tested unit, Android changed from 2,600 to 10,000 mAh after the edit.

The percentage may still need several complete, supervised charge/discharge cycles to become useful, and an old fuel-gauge implementation may never be very accurate. Treat voltage, temperature, and measured runtime as more trustworthy than a single percentage reading.

## Charging-time reality

The tested firmware reported roughly 600 mA charging current. A 10 Ah-class pack can therefore need well over 16 hours in an ideal calculation, and longer while the tablet is running. The design-capacity field does not raise that current.
