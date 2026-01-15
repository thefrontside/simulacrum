export default function simulation() {
  // deliberately exit immediately so the parent sees a child that dies
  // before it can emit its listening-info JSON line
  process.exit(1);
}
