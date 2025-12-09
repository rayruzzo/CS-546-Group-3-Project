import * as yup from "yup";

export const signupSchema = yup.object().shape({
    email: yup
        .string()
        .required("Email is required.")
        .email("Invalid email format.")
        .max(255),
    username: yup
        .string()
        .required("Username is required.")
        .min(2, "Username must be at least 2 characters.")
        .max(30, "Username cannot exceed 30 characters.")
        .matches(/^[a-zA-Z0-9]+$/, "Username must be alphanumeric."),
    password: yup
        .string()
        .required("Password is required.")
        .min(8, "Password must be at least 8 characters.")
        .matches(/[A-Z]/, "Password must contain at least one uppercase letter.")
        .matches(/[0-9]/, "Password must contain at least one number.")
        .matches(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character."),
    confirmpassword: yup
        .string()
        .required("Confirmation password is required.")
        .oneOf([yup.ref("password")], "Passwords must match."),
    zipcode: yup
        .string()
        .required("Zip code is required.")
        .matches(/^\d{5}$/, "Zip code must be a 5-digit number."),
    // role: yup
    //     .string()
    //     .oneOf(["user", "admin"], "Invalid role.") // Ensure role is 'user' or 'admin'
    //     .required("Role is required."),
});