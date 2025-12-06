import http, { ServerResponse } from "node:http";

/**
 * Render the HTTP error view with the given `resStatusCode`
 * 
 * @param {ServerResponse} res    - an Node server response object
 * @param {number} resStatusCode  - a valid HTTP response code
 * @param {string} [errorMessage] - an (optional) "extended", more specific error message to display
 * @param {Object} [context]      - any other (optional) context to pass to the template
 * @returns {void}                 renders the page
 */
const renderErrorPage = (res, resStatusCode, errorMessage, context) => {
   
   const statusDescriptions = {
      400: "Your request was invalid.",
      401: "You must be logged in to do that.",
      403: "You do not have the required privileges to access this page.",
      404: "This page does not exist in our community.",
      429: "Please turn down the requests a bit. We just run a community server here!",

      // default:
      500: "Oops. An issue happened on our end!"
   }


   if (!(res instanceof ServerResponse))
      throw new Error("You must pass in the Response object");
   if (!http.STATUS_CODES[resStatusCode])
      throw new Error("Unsupported http status code for rendering the error page", {cause: resStatusCode});
   if (errorMessage && (typeof errorMessage !== "string"))
      throw new Error("You must pass down the error message", {cause: errorMessage});
   if (context && (typeof context !== "object" || Object(context) !== context)) {
      throw new Error("Provided context must be an object");
   }

   res.status(resStatusCode)
      .render("http-error", {
         errorMessage:   errorMessage,
         context:        context, 
         status: {
            code:        resStatusCode,
            message:     http.STATUS_CODES[resStatusCode],
            description: statusDescriptions[resStatusCode] || statusDescriptions[500]
         },
         title: http.STATUS_CODES[resStatusCode] 
      });
};

Object.freeze(renderErrorPage);

export { renderErrorPage }