package com.quiz.service;

import com.quiz.dto.AuditEvent;
import com.quiz.dto.PollProgressUpdate;

public interface PollListener {
    void onProgress(PollProgressUpdate update);

    void onAudit(AuditEvent event);
}
