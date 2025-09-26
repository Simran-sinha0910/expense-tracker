async function addExpense() {
  const token = localStorage.getItem("token");
  if (!token) return window.location.href = "login.html";

  const description = document.getElementById("desc").value;
  const type = document.getElementById("type").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const details = document.getElementById("details").value;
  const dateInput = document.getElementById("date");
  const dateISO = dateInput && dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString();

  try {
    const res = await fetch("http://localhost:5000/api/expenses", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      // include a date so exports always have a value
      body: JSON.stringify({ description, type, amount, details, date: dateISO })
    });

    if (!res.ok) return alert("Failed to add expense");

    alert("Expense added!");
    window.location.href = "dashboard.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}
