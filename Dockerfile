# syntax=docker/dockerfile:1.7
FROM eclipse-temurin:17-jre
WORKDIR /app

ARG JAR_FILE=pet-clinic-web/target/pet-clinic-web-0.0.5-SNAPSHOT.jar

COPY ${JAR_FILE} app.jar

RUN mkdir -p /app/uploads /app/logs

ENV SPRING_PROFILES_ACTIVE=production,springdatajpa \
    SERVER_PORT=8080

EXPOSE 8080

ENTRYPOINT ["java","-jar","/app/app.jar"]
