package com.quiz.dto;

import java.time.Instant;

public record PollProgressUpdate(
        int poll,
        String status,
        int eventsFound,
        int duplicatesSkipped,
        int totalUnique,
        Instant emittedAt,
        Long deltaFromPreviousPollMs
) {
}
