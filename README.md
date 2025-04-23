# Video Processing API

API escalável para processamento de vídeos com geração de URLs pré-assinadas, extração de frames e armazenamento em nuvem, seguindo princípios de arquitetura limpa, arquitetura hexagonal e Domain-Driven Design.

## 🌟 Funcionalidades Principais
- **Upload Seguro de Vídeos**: Geração de URLs pré-assinadas para upload direto ao S3
- **Processamento Assíncrono**: Fila SQS para orquestração de tarefas pesadas
- **Frame Extraction**: Extração de frames em background com FFmpeg

<p align="center" style="background-color: #ffffff; padding: 10px;">
  <img src="./images/diagram.svg" alt="V1">
  <br>
  <em>Figura 1: Fluxo do Processamento</em>
</p>
