package com.quiz.model;

import java.util.List;

public record PollResponse(
        List<QuizEvent> events
) {
}
