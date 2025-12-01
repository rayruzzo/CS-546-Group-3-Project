import * as yup from "yup";

export const loginSchema = yup.object({
    email: yup
        .string()
        .trim()
        .email("Invalid email format")
        .required("Email is required"),
    
    password: yup
        .string()
        .trim()
        .min(1, "Password is required")
        .required("Password is required")
});