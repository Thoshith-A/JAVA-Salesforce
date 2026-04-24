package com.quiz.dto;

public record AuditEvent(
        int poll,
        String roundId,
        String participant,
        int score,
        boolean duplicate,
        String reason
) {
}
