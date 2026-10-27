const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The portfolio that hosts JCover (one folder up), opened on its Projects panel. */
export const PORTFOLIO_URL = `${BASE_PATH.replace(/\/jcover$/, "")}/#projects`;

export const CONTACT_EMAIL = "delrosariomrj@gmail.com";
