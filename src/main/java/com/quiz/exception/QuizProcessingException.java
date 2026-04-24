package com.quiz.exception;

public class QuizProcessingException extends RuntimeException {
    public QuizProcessingException(String message) {
        super(message);
    }

    public QuizProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
