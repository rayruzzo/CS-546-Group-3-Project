import { InputMessager, visuallyHide, showElement } from "./elementUtils.js";


export class AvatarUploader {

   // ### !!! VARIABLES RECEIVED FROM SERVER: !!! ### //
   // `avatarAllowedMIMETypes`  - Map<string, string> //
   // `avatarMaxOriginalSizeMB` - number              //
   // ############################################### //

   #squareSize    = 200;
   #resizeQuality = 1;

   #reader      = new FileReader();
   #MB_IN_BYTES = 1048576;
   #mbLimit     = avatarMaxOriginalSizeMB * this.#MB_IN_BYTES;
   
   #avatarUploaderRoot;
   #avatarForm;

   // file-related
   fileInput;
   #imgResizedInput;
   #imgResizedSquareInput;
   #blob;                   // stores blob temporarily
   
   // image-related
   #avatarContainer;
   avatarPreview;
   #spinner;

   // messager
   #fileMessageContainer;
   messager;

   // buttons
   #removeAvatarBtn;

   #options = {
      imgResizedDataUrl:   null,
      imgResizedSquareDataUrl: null,
      left: 0,
      top: 0,
      canvasWidth: null,
      canvasHeight: null
   }

   // CUSTOM EVENTS
   #imgResizedEvent       = new CustomEvent("imgResized");
   #avatarCroppedAndReady = new CustomEvent("avatarCroppedAndReady");


   constructor({
      avatarUploaderRoot    = "#avatarUploader",
      avatarForm            = "#avatarForm",

      fileInput             = "#fileName",
      imgResizedInput       = "#imgResized",
      imgResizedSquareInput = "#imgResizedSquare",

      avatarContainer       = "#avatarContainer",
      avatarPreview         = "#avatarPreview",
      spinner               = ".spinner",

      fileMessageContainer  = "#fileInputMessage",

      removeAvatarBtn       = "#removeAvatar",

      resizeQuality

   } = {}) {
      this.#avatarUploaderRoot    = document.querySelector(avatarUploaderRoot);
      this.#avatarForm            = this.#avatarUploaderRoot.querySelector(avatarForm);
      this.fileInput              = this.#avatarUploaderRoot.querySelector(fileInput);
      this.#imgResizedInput       = this.#avatarUploaderRoot.querySelector(imgResizedInput);
      this.#imgResizedSquareInput = this.#avatarUploaderRoot.querySelector(imgResizedSquareInput);
      this.#avatarContainer       = this.#avatarUploaderRoot.querySelector(avatarContainer);
      this.avatarPreview          = this.#avatarUploaderRoot.querySelector(avatarPreview);
      this.#spinner               = this.#avatarContainer.querySelector(spinner);
      this.#fileMessageContainer  = this.#avatarUploaderRoot.querySelector(fileMessageContainer);
      this.#removeAvatarBtn       = this.#avatarUploaderRoot.querySelector(removeAvatarBtn);

      this.#resizeQuality         = resizeQuality;
      this.messager               = new InputMessager(this.#fileMessageContainer);

      // bind `this` from the class itself so it inherits the `prototype` chain
      // and so new instances of `AvatarUploader`s `handleFileChange()` share the same reference
      // (if using function expressions as a class field, every new instance creates a 
      // new reference and allocates a new closure, as they are not defined on the `prototype`)
      this.handleDOMContentLoaded                 = this.handleDOMContentLoaded.bind(this);

      this.handleFileReaderChange                = this.handleFileReaderChange.bind(this);
      this.handleFileReaderEvent                 = this.handleFileReaderEvent.bind(this);
      this.handleFileReaderLoadAndResizeOriginal = this.handleFileReaderLoadAndResizeOriginal.bind(this)
      this.handleImgResizedEvent                 = this.handleImgResizedEvent.bind(this);
      this.handleAvatarCroppedAndReadyEvent      = this.handleAvatarCroppedAndReadyEvent.bind(this)
      this.handleImgResizedUpdate                = this.handleImgResizedUpdate.bind(this);
      this.handleImageLoad                       = this.handleImageLoad.bind(this);
      this.resizeImage                           = this.resizeImage.bind(this);
      this.handleImageResizing                   = this.handleImageResizing.bind(this);

      this.handlePointerDown                     = this.handlePointerDown.bind(this);
      this.handlePointerUp                       = this.handlePointerUp.bind(this);
      this.handlePointerMove                     = this.handlePointerMove.bind(this)
      
      this.handleResetAvatarUploader             = this.handleResetAvatarUploader.bind(this);
      this.handleSubmit                          = this.handleSubmit.bind(this);
      this.handleAvatarSubmit                    = this.handleAvatarSubmit.bind(this);
   }

   init() {
      
      // just reset avatar form on "DOMContentLoaded"
      document.addEventListener("DOMContentLoaded", this.handleDOMContentLoaded, {once: true});

      this.fileInput.addEventListener("change", this.handleFileReaderChange);

      // setup a single handler for different types of `FileReader` events
      ["loadstart", "load", "loadend", "error", "abort"].forEach((type) => {
         this.#reader.addEventListener(type, this.handleFileReaderEvent);
      });

      // setup `FileReader` "load"
      this.#reader.addEventListener("load", this.handleFileReaderLoadAndResizeOriginal);

      // setup custom events that deal with knowing when image resizing is done
      this.#avatarUploaderRoot.addEventListener("imgResized", this.handleImgResizedEvent);
      this.#avatarUploaderRoot.addEventListener("avatarCroppedAndReady", this.handleAvatarCroppedAndReadyEvent);

      // handles loading of a preview image
      this.avatarPreview.addEventListener("load", this.handleImageLoad);

      this.#avatarForm.addEventListener("submit", this.handleSubmit);

      this.#removeAvatarBtn.addEventListener("click", this.handleResetAvatarUploader);
   }


   // HELPERS
   cleanBase64DataUrl(url) {
      return url.replace(/^data:.+;base64,/, "");
   }

   #resetFormAndDataValues(event) {
      
      // reset form values
      if (
         (event.type === "click" && event.target === this.#removeAvatarBtn) ||
         (event.type === "DOMContentLoaded")
      ) {
         this.fileInput.value           = "";  // resets value (ex. clicked on "Remove")
      }
      this.#imgResizedInput.value       = "";
      this.#imgResizedSquareInput.value = "";
      this.avatarPreview.src            = "";

      // reset all previous values
      this.#blob                            = null;
      this.#options.imgResizedDataUrl       = null;
      this.#options.imgResizedSquareDataUrl = null;
      this.#options.top                     = null;
      this.#options.left                    = null;
      this.#options.canvasWidth             = null;
      this.#options.canvasHeight            = null;
   }

   ////////////////////
   // EVENT HANDLERS //
   ////////////////////
   handleDOMContentLoaded(event) {

      this.#resetFormAndDataValues(event);
   }

   /**
    * Handles an explicit file select change from an `<input type="file">` element
    * 
    * @param {Event} event - a `change` event from any input-like element 
    * @returns {void}
    */
   handleFileReaderChange(event) {

      const { files } = event.target;

      this.messager.reset();

      if (files.length > 1) {
         this.messager.error("Select one image only"); 
      } else if (!avatarAllowedMIMETypes.has(files[0].type)) {
         this.messager.error("Unsupported file type");
      } else if (files[0].size > this.#mbLimit) {
         this.messager.error("Image is too large");
      }

      if (this.messager.isErrored) {
         visuallyHide(this.#removeAvatarBtn);
         this.#resetFormAndDataValues(event);
         return;
      }
      
      // reset to a clean slate upon a change of file
      this.handleResetAvatarUploader(event);
      
      // then actually read the file
      this.#reader.readAsDataURL(files[0]);

      return;
   }

   /**
    * A handler for when after an image is selected from a file
    * input and its contents have been read. This resizes the image
    * to display and then be available for an optional repositioning.
    * 
    * @param {ProgressEvent} event - An event from a `FileReader`, etc.
    * @returns {void}
    */
   handleFileReaderLoadAndResizeOriginal(event) {

      this.resizeImage().then((val) => {
         console.log(val);
         this.#avatarUploaderRoot.dispatchEvent(this.#imgResizedEvent);
         return;
      });
   }

   /**
    * Handles initiating a read of the image after being notified 
    * with the custom "imgResized" event.
    * 
    * @param {CustomEvent} event - An "imgResized" event
    * @returns {void}
    */
   handleImgResizedEvent(event) {

      this.#reader.removeEventListener("load", this.handleFileReaderLoadAndResizeOriginal);
      this.#reader.addEventListener("load", this.handleImgResizedUpdate);

      if (this.#blob) this.#reader.readAsDataURL(this.#blob);
      return;
   }

   /**
    * A handler for when after an image has been resized for the first time and its contents
    * have been read. This sets the `src` of the avatar preview to the newly resized image.
    * 
    * @param {ProgressEvent} event - An event from a `FileReader`, etc.
    * @returns {void}
    */
   handleImgResizedUpdate(event) {

      // update state + HTML
      this.#options.imgResizedDataUrl = this.#reader.result;
      this.#imgResizedInput.value     = this.#reader.result;
      this.avatarPreview.src          = this.#reader.result;

      this.#spinner.hidden = true;
      return;
   }

   /**
    * Handles initiating a read of the image after being notified 
    * with the custom "avatarCroppedAndReady" event
    * 
    * @param {CustomEvent} event - An "avatarCroppedAndReady" event
    * @returns {void}
    */
   handleAvatarCroppedAndReadyEvent(event) {

      this.#reader.removeEventListener("load", this.handleImgResizedUpdate);
      this.#reader.addEventListener("load", this.handleAvatarSubmit);

      if (this.#blob) this.#reader.readAsDataURL(this.#blob);
      return;
   }

   /**
    * Handles updating this form with the final square/cropped version
    * of the avatar and then submits this
    * 
    * @param {ProgressEvent} event - An event from a `FileReader`, etc. Specifically a `load` event.
    * @returns {void}
    */
   handleAvatarSubmit(event) {

      this.#options.imgResizedSquareDataUrl = this.#reader.result;
      this.#imgResizedSquareInput.value     = this.#reader.result;

      this.#avatarForm.submit();
   }

   /**
    * Handles multiple types of events from a `FileReader` or any type that
    * implements the `ProgressEvent` interface. Used mostly for UI reasons.
    * 
    * @param {ProgressEvent} event - An event from a `FileReader`, etc.
    * @returns {void}
    */
   handleFileReaderEvent(event) {

      switch (event.type) {
         case "loadstart":
            this.#spinner.hidden = false;
            console.log("loadstart:", event); 
            break;
         case "load": 
            console.log("FileReader loaded successfully:", event); 
            break;
         case "loadend":
            console.log("loadend:", event);
            break;
         case "error":
            this.#spinner.hidden = true;
            console.log("ERROR:", event);
            this.messager.error("An error occurred reading the file");
            break;
         case "abort":
            this.#spinner.hidden = true;
            console.log("ABORT:", event);
            this.messager.error("Aborted reading file");
            break;
         default:
            break;
      }

      return;
   }

   /**
    * Handles an image's styling and positioning after its
    * `src` property is changed, thus triggering a "load" event
    * 
    * @param {Event} event - A "load" event, specifically from an `HTMLImageElement`
    * @returns {void}
    */
   handleImageLoad(event) {
      const { width, height, clientWidth, clientHeight } = event.target;

      // set the image fit to "cover"
      if (height > width) {
         this.avatarPreview.style.width  = "100%";
         this.avatarPreview.style.height = "auto";
      } else {
         this.avatarPreview.style.removeProperty("width");
         this.avatarPreview.style.removeProperty("height");
      }

      // allow the image to be repositioned in the square
      this.messager.text("Drag to reposition");

      // update resizing settings
      this.#options.left = this.avatarPreview.offsetLeft;
      this.#options.top  = this.avatarPreview.offsetTop;

      showElement(this.#removeAvatarBtn);
      
      // reset position
      this.avatarPreview.style.left = 0;
      this.avatarPreview.style.top  = 0;

      this.avatarPreview.removeEventListener("pointerdown", this.handlePointerDown);
      this.avatarPreview.removeEventListener("pointermove", this.handlePointerMove);
      this.avatarPreview.removeEventListener("pointerup", this.handlePointerUp);
      this.avatarPreview.removeEventListener("touchstart", this.handleTouchStart);

      this.avatarPreview.addEventListener("pointerdown", this.handlePointerDown);
      this.avatarPreview.addEventListener("pointermove", this.handlePointerMove);
      this.avatarPreview.addEventListener("pointerup", this.handlePointerUp);
      this.avatarPreview.addEventListener("touchstart", this.handleTouchStart);
   }

   /**
    * Create a new image outside the DOM to then pass to a resizing operation 
    * using the inputted image from the file input
    * 
    * @returns {Promise} A promise to the result of an image resizing operation
    */
   async resizeImage() {

      const newImg = document.createElement("img");
      newImg.src   = this.#reader.result;

      newImg.addEventListener("error", (event) => {
         console.error("An error occured loading a resized image", event);
         this.messager.text("Oops. Something wrong happened");
      });

      return new Promise((resolve, reject) => {

         return newImg.onload = async (event) => {
            try {
               await this.handleImageResizing(event);
               resolve("> Image completed resizing");
            } catch (error) {
               this.messager.error("Error resizing image")
               reject("> Error resizing image");
            }
         };
      })
   }

   /**
    * Performs the actual resizing operation on an image. Only a Promise is returned,
    * since the private blob field is updated within this function
    * 
    * @param {Event} event - A "load" event, specifically from an `HTMLImageElement`
    * @returns {Promise} A success or failure of the resizing operation
    */
   async handleImageResizing(event) {

      const { target } = event;

      if (!(target instanceof HTMLImageElement) || !target.src || !target.width || !target.height )
         throw new Error("Not a valid <img> element to resize");

      const aspectRatio = target.width / target.height;

      let scaledWidth;
      let scaledHeight;

      // "Fill-Screen" - setting (no letterboxing)
      if (aspectRatio >= 1) {
         // wide photos
         scaledHeight = this.#squareSize;
         scaledWidth  = scaledHeight * aspectRatio;
      } else {
         // tall photos
         scaledWidth  = this.#squareSize;
         scaledHeight = scaledWidth / aspectRatio;
      }
      
      // this is a newer API that may not be supported before 2023
      const offscreenCanvas  = new OffscreenCanvas(this.#squareSize, this.#squareSize);
      const canvasContext    = offscreenCanvas.getContext("2d");

      // set dimensions
      offscreenCanvas.width  = this.#options.canvasWidth  || scaledWidth;
      offscreenCanvas.height = this.#options.canvasHeight || scaledHeight;

      this.#options.left = this.#options.left || 0;
      this.#options.top  = this.#options.top  || 0;

      canvasContext.drawImage(target, this.#options.left, this.#options.top, scaledWidth, scaledHeight);

      // image has been resized and data is now a blob
      this.#blob = await offscreenCanvas.convertToBlob({type: "image/jpeg", quality: this.#resizeQuality});

      return;
   }

   /**
    * Resets an AvatarUploader to a clean slate
    * 
    * @param {Event} event - any event type
    * @returns {void}
    */
   handleResetAvatarUploader(event) {

      // reset event listeners
      this.#reader.removeEventListener("load", this.handleFileReaderLoadAndResizeOriginal);
      this.#reader.removeEventListener("load", this.handleImgResizedUpdate);
      this.#reader.removeEventListener("load", this.handleAvatarSubmit);
      this.#reader.addEventListener("load", this.handleFileReaderLoadAndResizeOriginal);

      this.messager.reset();

      // reset form and data values
      this.#resetFormAndDataValues(event);

      visuallyHide(this.#removeAvatarBtn);
      this.#spinner.hidden = true;

      return;
   }

   handleTouchStart(event) {
      event.preventDefault();
   }

   handlePointerDown(event) {
      event.target.style.cursor = "move";
      this.avatarPreview.setPointerCapture(event.pointerId);
      return;
   }

   handlePointerUp(event) {
      event.target.style.cursor = "grab"; 
      return;
   }

   /**
    * A `PointerEvent` handler for handling a pointer's coordinates. 
    * In this case, it is for taking note of an image's coordinates
    * in a frame, before it is cropped to a square
    * 
    * @param {PointerEvent} event - a pointer event
    * @returns {void}
    */
   handlePointerMove(event) {
      if (!this.avatarPreview.hasPointerCapture(event.pointerId)) return;

      const { offsetLeft, offsetTop, clientWidth, clientHeight } = event.target;

      const boundsX = (0 - clientWidth) + this.#squareSize;
      const boundsY = (0 - clientHeight) + this.#squareSize;

      // initial positions
      let left = 0;  let top = 0;
      
      // set bounds of dragging to the containing box
      if (clientWidth >= clientHeight) {
         // wide image - only `left` is set, `top` is always 0
         left = Math.min(Math.max(boundsX, offsetLeft + event.movementX), 0);
      } else {
         // tall image - only `top` is set, `left` is always 0
         top  = Math.min(Math.max(boundsY, offsetTop + event.movementY), 0);
      }

      this.#options.left = left;
      this.#options.top  = top;
      
      this.avatarPreview.style.left = `${left}px`;
      this.avatarPreview.style.top  = `${top}px`;
      return;
   }

   /**
    * Contrary to what this is called, it MAY submit something.
    * If there was no image selected or there was any error, it would not submit anything.
    * Otherwise, it dispatches an event to handle the final reading of the cropped image.
    * 
    * @param {SubmitEvent} event - any submit event
    * @returns {void}
    */
   // TODO: move below out of this function so that `imgResizedSquare` is only generated on full form submit
   handleSubmit(event) {
      event.preventDefault();

      // allow form submission without avatar
      if (!this.#options.imgResizedDataUrl) {
         event.target.submit();
         return;
      }

      // set canvas dimensions to SQUARE for avatar
      this.#options.canvasWidth  = this.#squareSize;
      this.#options.canvasHeight = this.#squareSize;

      // resize image for final time
      this.resizeImage().then((val) => {
         console.log(val);
         this.#avatarUploaderRoot.dispatchEvent(this.#avatarCroppedAndReady);
      });
   }
}


const avatarUploader = new AvatarUploader();
avatarUploader.init();
