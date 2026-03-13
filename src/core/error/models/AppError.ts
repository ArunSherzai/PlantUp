export abstract class AppError extends Error {
    public code: string;
    public userMessage: string;
    public isOperational: boolean;

    constructor(message: string, code: string, userMessage: string, isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.userMessage = userMessage;
        this.isOperational = isOperational;

        // Fix prototype chain for instanceof checks (important in TS/JS classes extending Error)
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
