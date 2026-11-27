ARG PYTHON_IMAGE
FROM ${PYTHON_IMAGE}
WORKDIR /app
COPY --chown=65532:65532 normalizer.py /app/normalizer.py
USER 65532:65532
ENTRYPOINT ["python3", "-I", "-B", "/app/normalizer.py"]
