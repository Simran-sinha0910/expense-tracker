async function registerUser() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPass").value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Registration failed");

    alert("Registration successful! Please login.");
    window.location.href = "login.html";
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function loginUser() {
  const email = document.getElementById("logEmail").value;
  const password = document.getElementById("logPass").value;

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || "Login failed");

    localStorage.setItem("token", data.token);
    window.location.href = "dashboard.html";
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
