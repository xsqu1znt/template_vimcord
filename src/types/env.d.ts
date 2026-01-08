declare namespace NodeJS {
    interface ProcessEnv {
        TOKEN?: string;
        TOKEN_DEV?: string;
        [key: string]: string | undefined;
    }
}
