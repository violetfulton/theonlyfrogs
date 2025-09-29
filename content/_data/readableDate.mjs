export default function readableDate(dateObj) {
  return new Date(dateObj).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
