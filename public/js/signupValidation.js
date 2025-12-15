import { InputMessager } from "./elementUtils.js";

const form                 = document.querySelector("#userForm" || "form[action='/signup'");
const profileUploaderRoot  = document.querySelector("#profileUploader"); 

const usernameInput        = form.querySelector("#username");
const usernameHint         = form.querySelector("#usernameHint");
const emailInput           = form.querySelector("#email");
const emailHint            = form.querySelector("#emailHint");
const passwordInput        = form.querySelector("#password");
const passwordHint         = form.querySelector("#passwordHint");
const confirmPasswordInput = form.querySelector("#confirmPassword");
const confirmPasswordHint  = form.querySelector("#confirmPasswordHint");
const dobInput             = form.querySelector("#dob");
const dobHint              = form.querySelector("#dobHint");
const zipcodeInput         = form.querySelector("#zipcode");
const zipcodeHint          = form.querySelector("#zipcodeHint");

const currentPasswordInput = form.querySelector("#currentPassword");
const currentPasswordHint  = form.querySelector("#currentPasswordHint");
const newPasswordInput     = form.querySelector("#newPassword");
const newPasswordHint      = form.querySelector("#newPasswordHint");
const firstNameInput       = form.querySelector("#firstName");
const firstNameHint        = form.querySelector("#firstNameHint");
const lastNameInput        = form.querySelector("#lastName");
const lastNameHint         = form.querySelector("#lastNameHint");
const bioInput             = form.querySelector("#bio");
const bioHint              = form.querySelector("#bioHint");

const userDataMessage      = form.querySelector("#userDataMessage");
const submitProgress       = form.querySelector("progress");
const submitBtn            = form.querySelector("#newAccount");

usernameInput?.addEventListener("blur", handleYupInputCheck);
emailInput?.addEventListener("blur", handleYupInputCheck);
passwordInput?.addEventListener("blur", handlePasswordInputCheck);
confirmPasswordInput?.addEventListener("blur", handlePasswordInputCheck);
dobInput?.addEventListener("blur", handleYupInputCheck);
zipcodeInput?.addEventListener("blur", handleYupInputCheck);
submitBtn?.addEventListener("click", handleSignupFormSubmit);

// for user profile editing
currentPasswordInput?.addEventListener("blur", handlePasswordInputCheck);
firstNameInput?.addEventListener("blur", handleYupInputCheck);
lastNameInput?.addEventListener("blur", handleYupInputCheck);
bioInput?.addEventListener("blur", handleYupInputCheck);

const signupMessager = new InputMessager(userDataMessage);

// CUSTOM EVENTS
export const sendAvatarToFetch = new CustomEvent("sendAvatarToFetch");
profileUploaderRoot.addEventListener("sendAvatarToFetch", handleSignupFormSubmit);


const messagers = {
   username:        usernameHint && new InputMessager(usernameHint),
   email:           emailHint && new InputMessager(emailHint),
   password:        passwordHint && new InputMessager(passwordHint),
   confirmPassword: confirmPasswordHint && new InputMessager(confirmPasswordHint),

   currentPassword: currentPasswordHint && new InputMessager(currentPasswordHint),
   newPassword:     newPasswordHint && new InputMessager(newPasswordHint),

   firstName:       firstNameHint && new InputMessager(firstNameHint),
   lastName:        lastNameHint && new InputMessager(lastNameHint),

   bio:             bioHint && new InputMessager(bioHint),

   dob:             dobHint && new InputMessager(dobHint),
   zipcode:         zipcodeHint && new InputMessager(zipcodeHint),
}

const formInputs = {
   username:        usernameInput, 
   email:           emailInput, 
   password:        passwordInput, 
   confirmPassword: confirmPasswordInput, 

   currentPassword: currentPasswordInput, 
   newPassword:     newPasswordInput, 

   bio:             bioInput,

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
         if (mess?.isErrored) return;
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
      if (mess?.isErrored) {
         signupMessager.error("Please fix the errors on this form to continue");
         break;
      }
   }

   for (const [inputKey, inputVal] of Object.entries(formInputs)) {

      console.log("inputKEY", inputKey);


      // watch out for null props
      if (!inputVal) {
         continue;
      }

      // fake the event object to trigger all the handlers
      const event = { target: inputVal }

      // run the same handlers that were added to these input's "blur" events
      if (inputVal.id === passwordInput?.id || inputVal.id === confirmPasswordInput?.id) {
         handlePasswordInputCheck(event);
      } else {
         handleYupInputCheck(event);
      }
   }

   for (const mess of Object.values(messagers)) {
      if (mess?.isErrored) {
         signupMessager.error("Please fix the errors on this form to continue");
         return
      }
   }
   

   const formData = new FormData(form);

   

   for (const [key, val] of formData) {
      console.log(val);
      formData.set(key, DOMPurify.sanitize(val));
   }

   console.log(JSON.stringify(Object.fromEntries(formData)));


   // insert avatar if it exists
   const imgResizedInput       = form.querySelector("#imgResized");
   const imgResizedSquareInput = form.querySelector("#imgResizedSquare");

   if (imgResizedInput?.value && imgResizedSquareInput?.value) {

      console.log("REGULAR:", imgResizedInput.value);
      console.log("SQUARE", imgResizedSquareInput.value);
      // formData.set("resized", DOMPurify.sanitize(imgResizedInput?.value));
      // formData.set("resizedSquare", DOMPurify.sanitize(imgResizedSquareInput?.value));
   }


   try {

      // give a little animation
      submitProgress.hidden = false;

      const method = form.getAttribute("method").toString();



      const response = await fetch(form.action, {
         method: method,
         headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
         },
         body: JSON.stringify(Object.fromEntries(formData))
      });

      if (response.ok) {
         signupMessager.reset();
         signupMessager.success("Success! Redirecting...");

         // redirect to username
         const submittedData = Object.fromEntries(formData);

         const username = submittedData?.username;

         window.location.href = `/user/${username}/settings`;
      }

      if (!response.ok) {
         submitProgress.hidden = true;
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
