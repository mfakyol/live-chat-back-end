const err = document.querySelector("#err");
const errClose = document.querySelector("#err-close");
const form = document.querySelector("#form");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const submitButton = document.querySelector("#submit-button");
const forceQuitMessage = document.querySelector("#force-quit-message");
const forcequitClose = document.querySelector("#force-quit-close");
const url = "http://localhost:3001/api/v1/auth";
const token = JSON.parse(localStorage.getItem("token"));
const isForceQuit = JSON.parse(localStorage.getItem("isForceQuit"));

if (isForceQuit) {
  forceQuitMessage.style.display = "block";
  localStorage.removeItem("isForceQuit");
}

if (token) {
  window.location.replace("/chat");
}

errClose.addEventListener("click", (e) => {
  e.target.parentNode.style.display = "none";
  e.target.parentNode.children[0].textContent = "";
});

submitButton.addEventListener("click", (e) => {
  errClose.parentNode.style.display = "none";
  errClose.parentNode.children[0].textContent = "";
  e.preventDefault();
  if (email.value === "" || password.value === "") {
    err.children[0].innerText = "Please fill all fields.";
    err.style.display = "block";
    return;
  }
  axios
    .get(url, { params: { email: email.value, password: password.value } })
    .then((res) => res.data)
    .then(({ status, token, message }) => {
      if (!status) {
        err.children[0].innerText = message;
        err.style.display = "block";
      } else {
        localStorage.setItem("token", JSON.stringify(token));
        window.location.replace("/chat");
      }
    })
    .catch((error) => {
      err.children[0].innerText = "An error occured please try again later.";
      err.style.display = "block";
    });
});

forcequitClose.addEventListener("click", (e) => {
  e.target.parentNode.style.display = "none";
});
