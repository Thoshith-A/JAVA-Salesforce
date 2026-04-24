FROM eclipse-temurin:17-jre
WORKDIR /app
COPY target/quiz-leaderboard-1.0.0.jar /app/quiz-leaderboard.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/quiz-leaderboard.jar"]
