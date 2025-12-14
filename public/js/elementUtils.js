
export function visuallyHide(element) {
   if (!(element instanceof HTMLElement))
      throw new Error("Not a valid HTMLElement type");

   element.classList.add("visually-hidden");
   return;
}

export function showElement(element) {
   if (!(element instanceof HTMLElement))
      throw new Error("Not a valid HTMLElement type");

   element.classList.remove("visually-hidden");
   return;
}


/**
 * An updatable message to show near input elements (ex. info, errors)
 */
export class InputMessager {
   #isErrored        = false;
   #messageContainer = null;

   constructor(messageContainer) {
      if (!(messageContainer instanceof HTMLElement))
         throw new Error("Not a valid HTMLElement type");

      this.#messageContainer = messageContainer;
   }

   #validateString(string) {
      if (typeof string !== "string" && !string.trim())
         throw new Error("Text to show must be a non-empty string");
   }

   #show() {
      showElement(this.#messageContainer);
      return this;
   }

   text(text) {
      this.#validateString(text);
      this.#messageContainer.innerText = text.trim();
      return this.#show();
   }

   error(text) {
      this.#validateString(text);
      this.#messageContainer.innerText = text.trim();
      this.#messageContainer.classList.remove("input-success");
      this.#messageContainer.classList.add("input-error");
      this.#isErrored = true;
      return this.#show();
   }

   success(text) {
      this.#validateString(text);
      this.#messageContainer.innerText = text.trim();
      this.#messageContainer.classList.remove("input-error");
      this.#messageContainer.classList.add("input-success");
      this.#isErrored = false;
      return this.#show();
   }

   hide() {
      this.#messageContainer.innerText = "";
      this.#messageContainer.classList.remove("input-error");
      visuallyHide(this.#messageContainer);
      return this;
   }

   reset() {
      this.#isErrored = false;
      this.hide();
   }

   get isErrored() {
      return this.#isErrored;
   }

   get id() {
      return this.#messageContainer.id;
   }
}