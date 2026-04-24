package com.quiz.service;

import com.quiz.model.SpectatorUpdate;
import com.quiz.model.SpectatorEventTrace;
import org.springframework.context.ApplicationListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class SpectatorBroadcastService implements
        ApplicationListener<SessionConnectEvent> {

    private final SimpMessagingTemplate messagingTemplate;
    private final AtomicInteger connectedCount = new AtomicInteger(0);
    private final Map<String, SpectatorUpdate> lastByJobId = new ConcurrentHashMap<>();
    private final Set<String> activeJobs = ConcurrentHashMap.newKeySet();

    public SpectatorBroadcastService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void broadcastPollUpdate(String jobId, SpectatorUpdate update) {
        activeJobs.add(jobId);
        SpectatorUpdate withCount = new SpectatorUpdate(
                update.pollNumber(),
                update.totalPolls(),
                update.leaderboard(),
                update.newEventsThisPoll(),
                update.duplicatesThisPoll(),
                update.totalUniqueParticipants(),
                update.rankChanges(),
                connectedCount.get(),
                update.jobStatus(),
                update.timestamp()
        );
        lastByJobId.put(jobId, withCount);
        messagingTemplate.convertAndSend("/topic/spectator/" + jobId, withCount);
    }

    public void broadcastEventTrace(String jobId, SpectatorEventTrace eventTrace) {
        activeJobs.add(jobId);
        messagingTemplate.convertAndSend("/topic/spectator/" + jobId + "/events", eventTrace);
    }

    public int getConnectedCount() {
        return connectedCount.get();
    }

    @Override
    public void onApplicationEvent(SessionConnectEvent event) {
        connectedCount.incrementAndGet();
        rebroadcastCounts();
    }

    @org.springframework.context.event.EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        connectedCount.updateAndGet(current -> Math.max(0, current - 1));
        rebroadcastCounts();
    }

    private void rebroadcastCounts() {
        for (String jobId : activeJobs) {
            SpectatorUpdate last = lastByJobId.get(jobId);
            if (last == null) {
                continue;
            }
            SpectatorUpdate withCount = new SpectatorUpdate(
                    last.pollNumber(),
                    last.totalPolls(),
                    last.leaderboard(),
                    last.newEventsThisPoll(),
                    last.duplicatesThisPoll(),
                    last.totalUniqueParticipants(),
                    last.rankChanges(),
                    connectedCount.get(),
                    last.jobStatus(),
                    System.currentTimeMillis()
            );
            lastByJobId.put(jobId, withCount);
            messagingTemplate.convertAndSend("/topic/spectator/" + jobId, withCount);
        }
    }
}
