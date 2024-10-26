from flask import Flask, jsonify
from flask_cors import CORS
import speech_recognition as sr

app = Flask(__name__)
CORS(app)  # Habilitar CORS para todas las rutas

def recognize_speech_from_mic():
    recognizer = sr.Recognizer()
    microphone = sr.Microphone()

    response = {
        "success": True,
        "error": None,
        "transcription": None,
        "status": []
    }

    try:
        with microphone as source:
            response["status"].append("Adjusting for ambient noise...")
            recognizer.adjust_for_ambient_noise(source, duration=2)  # Ajuste del ruido ambiente
            response["status"].append("Listening...")
            audio = recognizer.listen(source)  # Escuchar el audio
            response["status"].append("Processing audio...")

        # Usar Google Web Speech API para transcribir el audio
        response["transcription"] = recognizer.recognize_google(audio, language="es-MX")
        response["status"].append("Transcription successful.")
    except sr.RequestError:
        response["success"] = False
        response["error"] = "API unavailable"
    except sr.UnknownValueError:
        response["error"] = "Unable to recognize speech"

    return response

@app.route('/voice_input', methods=['POST'])
def handle_voice_input():
    result = recognize_speech_from_mic()
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
