-- Runs once when the Docker volume is first created (as POSTGRES_USER, who becomes the owner).
-- Creates the database used by API integration tests (its schema is reset on each test run).
CREATE DATABASE motoscope_test;
