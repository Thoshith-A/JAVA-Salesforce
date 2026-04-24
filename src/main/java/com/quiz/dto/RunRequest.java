package com.quiz.dto;

import jakarta.validation.constraints.NotBlank;

public record RunRequest(
        @NotBlank String regNo
) {
}
