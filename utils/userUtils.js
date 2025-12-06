// A small helper to help me unwrap the user object.
export function unwrapUser(result) {
    if (!result) return null;
    if (result.user) return result.user; 
    return result;                        
}