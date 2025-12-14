import { InputMessager } from "./elementUtils.js";

const signupForm = document.querySelector("#signupForm" || "form[action='/signup'");

const usernameInput        = signupForm.querySelector("#username");
const usernameHint         = signupForm.querySelector("#usernameHint");
const emailInput           = signupForm.querySelector("#email");
const emailHint            = signupForm.querySelector("#emailHint");
const passwordInput        = signupForm.querySelector("#password");
const passwordHint         = signupForm.querySelector("#passwordHint");
const confirmPasswordInput = signupForm.querySelector("#confirmPassword");
const confirmPasswordHint  = signupForm.querySelector("#confirmPasswordHint");
const dobInput             = signupForm.querySelector("#dob");
const dobHint              = signupForm.querySelector("#dobHint");
const zipcodeInput         = signupForm.querySelector("#zipcode");
const zipcodeHint          = signupForm.querySelector("#zipcodeHint");

const signupMessage        = signupForm.querySelector("#signupMessage");
const submitBtn            = signupForm.querySelector("button[type='submit']");

usernameInput.addEventListener("blur", handleYupInputCheck);
emailInput.addEventListener("blur", handleYupInputCheck);
passwordInput.addEventListener("blur", handlePasswordInputCheck);
confirmPasswordInput.addEventListener("blur", handlePasswordInputCheck);
dobInput.addEventListener("blur", handleYupInputCheck);
zipcodeInput.addEventListener("blur", handleYupInputCheck);
submitBtn.addEventListener("click", handleSignupFormSubmit);

const signupMessager = new InputMessager(signupMessage);

const messagers = {
   username:        new InputMessager(usernameHint),
   email:           new InputMessager(emailHint),
   password:        new InputMessager(passwordHint),
   confirmPassword: new InputMessager(confirmPasswordHint),
   dob:             new InputMessager(dobHint),
   zipcode:         new InputMessager(zipcodeHint),
}

const formInputs = {
   username:        usernameInput, 
   email:           emailInput, 
   password:        passwordInput, 
   confirmPassword: confirmPasswordInput, 
   dob:             dobInput, 
   zipcode:         zipcodeInput
}
   

// ### !!! VARIABLES RECEIVED FROM SERVER: !!! ### //
// `passwordErrorMessage` - string                 //
// ############################################### //

/**
 * Check the input validity of a given form input using Yup and provide feedback
 * 
 * @param {FocusEvent} event - a focus-type event (specifically tailored for a blur event)
 * @returns {void}
 */
async function handleYupInputCheck(event) {

   const { value, id } = event.target;

   const label = event.target.getAttribute("data-label") || id[0].toUpperCase() + id.substring(1);

   if (!value) {
      event.target.setAttribute("aria-invalid", true);
      event.target.setAttribute("aria-describedby", id);
      messagers[id].error(`${label} cannot be blank`);
      return;
   }

   try {
      const response = await fetch(`/check/${id}`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify({
            [id]: DOMPurify.sanitize(value)
         })
      });

      const result = await response.json();

      if (!response.ok) {
         event.target.setAttribute("aria-invalid", true);
         event.target.setAttribute("aria-describedby", id);
         messagers[id].error(result.message);
         return;
      }

      event.target.removeAttribute("aria-invalid");
      event.target.removeAttribute("aria-describedby");
      messagers[id].reset();

      for (const mess of Object.values(messagers)) {
         if (mess.isErrored) return;
      }

      signupMessager.reset();

      return;

   } catch (error) {

      console.error("Error fetching:", error);
      messagers[id].error(error.message);
   }
}


function handlePasswordInputCheck(event) {

   const { value, id, pattern } = event.target;

   const label = event.target.getAttribute("data-label") || id[0].toUpperCase() + id.substring(1);

   // fast fail on password confirmation
   if (
      (passwordInput.value && confirmPasswordInput.value) &&
      passwordInput.value !== confirmPasswordInput.value
   ) {
      event.target.setAttribute("aria-invalid", true);
      event.target.setAttribute("aria-describedby", id);
      messagers.confirmPassword.error("Passwords do not match");
      return;
   }

   // this regex contains some unicode-aware things so we need to pass the "v" option
   const parsedPattern = new RegExp(`${pattern}`, "v");
   const regexTest = parsedPattern.test(value);

   if (!value || !regexTest) {
      event.target.setAttribute("aria-invalid", true);
      event.target.setAttribute("aria-describedby", id);
   }

   if (!value) {
      messagers[id].error(`${label} cannot be blank`);
      return;
   }
   
   if (!regexTest) {
      messagers[id].error(`${label} ${passwordErrorMessage}`);
      return;
   }

   event.target.removeAttribute("aria-invalid");
   event.target.removeAttribute("aria-describedby");

   messagers[id].reset();

   for (const mess of Object.values(messagers)) {
      if (mess.isErrored) return;
   }

   signupMessager.reset();

   return;
}


async function handleSignupFormSubmit(event) {
   event.preventDefault();

   for (const mess of Object.values(messagers)) {
      if (mess.isErrored) {
         signupMessager.error("Please fix the errors on this form to continue");
         break;
      }
   }

   for (const [inputKey, inputVal] of Object.entries(formInputs)) {

      // fake the event object to trigger all the handlers
      const event = { target: inputVal }

      // run the same handlers that were added to these input's "blur" events
      if (inputVal.id === passwordInput.id || inputVal.id === confirmPasswordInput.id) {
         handlePasswordInputCheck(event);
      } else {
         handleYupInputCheck(event);
      }
   }

   for (const mess of Object.values(messagers)) {
      if (mess.isErrored) {
         signupMessager.error("Please fix the errors on this form to continue");
         return
      }
   }
   

   const formData = new FormData(signupForm);

   for (const [key, val] of formData) {
      formData.set(key, DOMPurify.sanitize(val));
   }

   try {

      const response = await fetch(`/signup`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify(Object.fromEntries(formData))
      });

      if (response.ok) {
         signupMessager.reset();
         signupMessager.success("Success! Redirecting...");
         window.location.href = "/";
      }

      if (!response.ok) {
         const result = await response.json();

         populateErrors(result)
         return;
      }

   } catch (error) {
      console.error("Error fetching:", error);
      signupMessager.error("Error processing request", error.message);
   }
}


function populateErrors(result) {

   signupMessager.error("Please fix the errors on this form to continue");

   result.inner.map((error) => {
      const split = error?.path?.split(".");

      if (split.length > 1) {   // if there is a nested field w/dot notation
         messagers[split[1]]?.error(error.message);
         formInputs[split[1]]?.setAttribute("aria-invalid", true);
         formInputs[split[1]]?.setAttribute("aria-describedby", formInputs[split[1]]?.id);
      } else {
         messagers[error.path]?.error(error.message);
         formInputs[error.path]?.setAttribute("aria-invalid", true);
         formInputs[error.path]?.setAttribute("aria-describedby", formInputs[error.path]?.id);
      }
   })

   if (!confirmPasswordInput.value) {
      // fake the event object to trigger all the handlers
      const event = { target: confirmPasswordInput }
      handlePasswordInputCheck(event);
   }
}
