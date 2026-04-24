package com.quiz.model;

public record SubmitResponse(
        boolean isCorrect,
        boolean isIdempotent,
        int submittedTotal,
        int expectedTotal,
        String message
) {
}
