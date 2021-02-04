const err = document.querySelector("#err");
const errClose = document.querySelector("#err-close");
const info = document.querySelector("#info");
const infoClose = document.querySelector("#info-close");
const form = document.querySelector("#form");
const form2 = document.querySelector("#form2");
const email = document.querySelector("#email");
const fullName = document.querySelector("#name");
const password = document.querySelector("#password");
const activationCode = document.querySelector("#activation-code");
const submitButton = document.querySelector("#submit-button");
const activationButton = document.querySelector("#activation-button");
const url = "http://localhost:3001/api/v1/auth";


errClose.addEventListener("click", (e) => {
  e.target.parentNode.style.display = "none";
  e.target.parentNode.children[0].textContent = "";
});
infoClose.addEventListener("click", (e) => {
  e.target.parentNode.style.display = "none";
  e.target.parentNode.children[0].textContent = "";
});

submitButton.addEventListener("click", (e) => {
  errClose.parentNode.style.display = "none";
  errClose.parentNode.children[0].textContent = "";
  e.preventDefault();
  if(email.value ==="" || fullName.value === "" || password.value === ""){
    err.children[0].innerText = "Please fill all fields.";
    err.style.display = "block";
    return
  }
  axios
    .post(url,{ email: email.value, fullName: fullName.value, password: password.value })
    .then((res) => res.data)
    .then(({ status, token, message }) => {
      if (!status) {
        err.children[0].innerText = message;
        err.style.display = "block";
      } else {
        err.children[0].innerText = "";
        err.style.display = "none";
        info.children[0].innerText = message;
        info.style.display = "block";
        form.style.display ="none";
        form2.style.display ="block";
      }
    })
    .catch(error => {
        err.children[0].innerText = "An error occured please try again later.";
        err.style.display = "block";
    });
});


activationButton.addEventListener('click', (e) => {
  err2.children[0].innerText = "";
  err2.style.display = "none";
  info.children[0].innerText = "";
  info.style.display = "none";
  e.preventDefault();

  if(email.value ==="" || activationCode.value === ""){
    err2.children[0].innerText = "Please fill all fields.";
    err2.style.display = "block";
    return
  }
  axios.put(url, {email: email.value, activationCode: activationCode.value})
  .then(res => res.data)
  .then(({status, message}) => {
    if(!status){
      err2.children[0].innerText = message;
      err2.style.display = "block";
    }
    else {
      info.children[0].innerText = message;
      info.style.display = "block";
    }
  })
  .catch(error => {
    err2.children[0].innerText = "An error occured please try again later.";
    err2.style.display = "block";
  })
})