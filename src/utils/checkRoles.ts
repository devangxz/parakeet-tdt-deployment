interface User {
    role: string;
}

export function requireCustomer(user: User): boolean {
    const allowedRoles = ["CUSTOMER", "ADMIN"];
    return allowedRoles.includes(user.role);
}