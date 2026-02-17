// basic init
document.getElementById("year").textContent = String(new Date().getFullYear());

document.getElementById("newsletterForm").addEventListener("submit", (e) => {
  e.preventDefault();
  alert("Subscribed (demo)!");
  e.target.reset();
});
