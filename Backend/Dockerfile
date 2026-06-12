FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /workspace/app

RUN apk add --no-cache bash

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY sonar-project.properties .
COPY checkstyle.xml .
COPY package.json .
COPY package-lock.json .
COPY src src

RUN chmod +x mvnw
RUN ./mvnw clean package -Pprod,-webapp -DskipTests -Dskip.npm=true -Dskip.installnodenpm=true

FROM eclipse-temurin:17-jre-alpine
VOLUME /tmp
COPY --from=build /workspace/app/target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar","--spring.profiles.active=prod"]
