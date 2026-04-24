FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /workspace

COPY pom.xml ./
COPY src ./src
COPY frontend ./frontend
COPY data ./data

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=builder /workspace/target/quiz-leaderboard-1.0.0.jar /app/quiz-leaderboard.jar

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -jar /app/quiz-leaderboard.jar --server.port=${PORT:-8080}"]
