'use strict';

const i18n = require('i18next');

// Locale resources
// prettier-ignore
const localeResources = {
  de: {
    translation: {
      'message.welcome': 'Willkommen bei Google Assistant für Alexa',
      'message.goodbye': 'Auf Wiedersehen!',
      'message.unhandled': 'Entschuldigung, das habe ich nicht verstanden.',
      'utterance.yes': 'Ja',
      'utterance.no': 'Nein',
      'utterance.help': 'Was kannst du tun',
      'utterance.cancel': 'Stornieren',
      'utterance.stop': 'Stopp',
      'utterance.goodbye': 'Auf Wiedersehen',
      'error.default': 'Etwas ist schief gelaufen.',
      'error.access_token': 'Das Google API access token wurde nicht bereitgestellt. Bitte deaktivieren Sie den Skill und aktivieren Sie ihn erneut.',
      'error.assistant': 'Von der Google Assistant API zurückgegebener Fehler.',
      'error.assistant_audio': 'Keine Audioantwort von der Google Assistant API erhalten',
      'error.assistant_timeout': 'Antwortzeitüberschreitung von der Google Assistant API',
      'error.device_address': 'Die Berechtigung für das Land und die Postleitzahl des Geräts wurde nicht erteilt. Bitte überprüfen Sie die Skill-Einstellungen in der Alexa App.',
      'error.maps_geocode': 'Fehler beim Abrufen der Geocode-Koordinaten von Google Maps.',
      'error.project_device': 'Beim Registrieren des Gerätemodells bei der Google API ist ein Fehler aufgetreten.',
      'error.project_instance': 'Beim Registrieren des Instanzmodells bei der Google API ist ein Fehler aufgetreten.',
      'error.storage_signed_url': 'Beim Erstellen der signierten URL ist ein Fehler aufgetreten.',
      'error.storage_upload': 'Beim Hochladen auf S3 ist ein Fehler aufgetreten.'
    }
  },
  en: {
    translation: {
      'message.welcome': 'Welcome to Google Assistant for Alexa',
      'message.goodbye': 'Goodbye!',
      'message.unhandled': "Sorry, I didn't get that.",
      'utterance.yes': 'Yes',
      'utterance.no': 'No',
      'utterance.help': 'What can you do',
      'utterance.cancel': 'Cancel',
      'utterance.stop': 'Stop',
      'utterance.goodbye': 'Goodbye',
      'error.default': 'Something went wrong.',
      'error.access_token': "The Google API access token wasn't provided. Please disable and re-enable the skill.",
      'error.assistant': 'Error returned from the Google Assistant API.',
      'error.assistant_audio': 'No audio response received from the Google Assistant API.',
      'error.assistant_timeout': 'Response timeout from the Google Assistant API.',
      'error.device_address': "The device country and postal code permission isn't granted. Please check the skill settings in the Alexa App.",
      'error.maps_geocode': 'Failed to get Google Maps geocode coordinates.',
      'error.project_device': 'There was an error registering the device model with the Google API.',
      'error.project_instance': 'There was an error registering the instance model with the Google API.',
      'error.storage_signed_url': 'There was an error creating the signed URL.',
      'error.storage_upload': 'There was an error uploading to S3.'
    }
  },
  es: {
    translation: {
      'message.welcome': 'Bienvenido a Google Assistant para Alexa',
      'message.goodbye': 'Adiós!',
      'message.unhandled': 'Perdón, no entendí eso.',
      'utterance.yes': 'Sí',
      'utterance.no': 'No',
      'utterance.help': 'Qué puedes hacer',
      'utterance.cancel': 'Cancelar',
      'utterance.stop': 'Detener',
      'utterance.goodbye': 'Adiós',
      'error.default': 'Algo salió mal.',
      'error.access_token': 'No se proporcionó el Google API access token. Desactive y vuelva a activar la skill.',
      'error.assistant': 'Error devuelto por Google Assistant API.',
      'error.assistant_audio': 'No se recibió respuesta de audio de Google Assistant API.',
      'error.assistant_timeout': 'Tiempo de espera de respuesta de Google Assistant API.',
      'error.device_address': 'No se otorga el permiso del código postal y del país del dispositivo. Verifique la configuración de skill en la aplicación Alexa.',
      'error.maps_geocode': 'No se pudieron obtener las coordenadas de geocodificación de Google Maps.',
      'error.project_device': 'Se produjo un error al registrar el modelo del dispositivo con la Google API.',
      'error.project_instance': 'Se produjo un error al registrar el modelo de instancia con la Google API.',
      'error.storage_signed_url': 'Hubo un error al crear la URL firmada.',
      'error.storage_upload': 'Hubo un error al cargar a S3.'
    }
  },
  fr: {
    translation: {
      'message.welcome': 'Bienvenue dans Google Assistant pour Alexa',
      'message.goodbye': 'Au revoir!',
      'message.unhandled': "Désolé, je n'ai pas compris.",
      'utterance.yes': 'Oui',
      'utterance.no': 'Non',
      'utterance.help': 'Que pouvez-vous faire',
      'utterance.cancel': 'Annule',
      'utterance.stop': 'Arrête',
      'utterance.goodbye': 'Au revoir',
      'error.default': "Quelque chose s'est mal passé.",
      'error.access_token': "Le Google API access token n'a pas été fourni. Veuillez désactiver et réactiver la skill.",
      'error.assistant': 'Erreur renvoyée par le Google Assistant API.',
      'error.assistant_audio': 'Aucune réponse audio reçue du Google Assistant API.',
      'error.assistant_timeout': 'Délai de réponse du Google Assistant API.',
      'error.device_address': "L'autorisation du pays de l'appareil et du code postal n'est pas accordée. Veuillez vérifier les paramètres de la skill dans l'application Alexa.",
      'error.maps_geocode': "Échec de l'obtention des coordonnées de géocodage de Google Maps.",
      'error.project_device': "Une erreur s'est produite lors de l'enregistrement du modèle d'appareil avec le Google API.",
      'error.project_instance': "Une erreur s'est produite lors de l'enregistrement du modèle d'instance avec le Google API.",
      'error.storage_signed_url': "Une erreur s'est produite lors de la création de l'URL signée.",
      'error.storage_upload': "Une erreur s'est produite lors du téléchargement vers S3."
    }
  },
  it: {
    translation: {
      'message.welcome': 'Benvenuto in Google Assitant per Alexa',
      'message.goodbye': 'Arrivederci!',
      'message.unhandled': "Scusa, non l'ho capito.",
      'utterance.yes': 'Sì',
      'utterance.no': 'No',
      'utterance.help': 'Cosa sai fare',
      'utterance.cancel': 'Annulla',
      'utterance.stop': 'Ferma',
      'utterance.goodbye': 'Arrivederci',
      'error.default': 'Qualcosa è andato storto.',
      'error.access_token': 'Il Google API access token non è stato fornito. Disabilita e riattiva la skill.',
      'error.assistant': "Errore restituito dall'Google Assitant API.",
      'error.assistant_audio': 'Nessuna risposta audio ricevuta dalla Google Assitant API.',
      'error.assistant_timeout': 'Timeout di risposta della Google Assitant API.',
      'error.device_address': "Il paese del dispositivo e l'autorizzazione del codice postale non sono concessi. Controlla le impostazioni delle skill nell'Alexa App.",
      'error.maps_geocode': 'Impossibile ottenere le coordinate di geocodifica di Google Maps.',
      'error.project_device': 'Si è verificato un errore durante la registrazione del modello del dispositivo con la Google API.',
      'error.project_instance': 'Si è verificato un errore durante la registrazione del modello di istanza con la Google API.',
      'error.storage_signed_url': "Si è verificato un errore durante la creazione dell'URL firmato.",
      'error.storage_upload': 'Si è verificato un errore durante il caricamento su S3.'
    }
  },
  ja: {
    translation: {
      'message.welcome': 'AlexaのGoogleAssistantへようこそ',
      'message.goodbye': 'さよなら！',
      'message.unhandled': '申し訳ありませんが、わかりませんでした。',
      'utterance.yes': 'はい',
      'utterance.no': 'いいえ',
      'utterance.help': 'あなたは何ができますか',
      'utterance.cancel': 'キャンセル',
      'utterance.stop': 'やめる',
      'utterance.goodbye': 'さようなら',
      'error.default': '何かがうまくいかなかった。',
      'error.access_token': 'GoogleAPIアクセストークンが提供されませんでした。 スキルを無効にしてから再度有効にしてください。',
      'error.assistant': 'GoogleAssistantAPIからエラーが返されました。',
      'error.assistant_audio': 'GoogleAssistantAPIから音声応答が受信されません。',
      'error.assistant_timeout': 'GoogleAssistantAPIからの応答タイムアウト。',
      'error.device_address': 'デバイスの国と郵便番号の許可は付与されていません。 Alexaアプリのスキル設定を確認してください。',
      'error.maps_geocode': 'GoogleMapsジオコード座標の取得に失敗しました。',
      'error.project_device': 'デバイスモデルをGoogleAPIに登録するときにエラーが発生しました。',
      'error.project_instance': 'インスタンスモデルをGoogleAPIに登録するときにエラーが発生しました。',
      'error.storage_signed_url': '署名付きURLの作成中にエラーが発生しました。',
      'error.storage_upload': 'S3へのアップロード中にエラーが発生しました。'
    }
  },
  pt: {
    translation: {
      'message.welcome': 'Bem-vindo ao Google Assistant para Alexa',
      'message.goodbye': 'Tchau!',
      'message.unhandled': 'Desculpe, não entendi.',
      'utterance.yes': 'Sim',
      'utterance.no': 'Não',
      'utterance.help': 'O que você pode fazer',
      'utterance.cancel': 'Cancelar',
      'utterance.stop': 'Pare',
      'utterance.goodbye': 'Tchau',
      'error.default': 'Algo deu errado.',
      'error.access_token': 'O Google API access token não foi fornecido. Desative e reative a skill.',
      'error.assistant': 'Erro retornado da Google Assistant API.',
      'error.assistant_audio': 'Nenhuma resposta de áudio recebida da Google Assistant API.',
      'error.assistant_timeout': 'Tempo limite de resposta da Google Assistant API.',
      'error.device_address': 'A permissão de país e código postal do dispositivo não é concedida. Verifique as configurações de skill no Alexa App.',
      'error.maps_geocode': 'Falha ao obter as coordenadas do geocódigo do Google Maps.',
      'error.project_device': 'Ocorreu um erro ao registrar o modelo do dispositivo com a Google API.',
      'error.project_instance': 'Ocorreu um erro ao registrar o modelo da instância com a Google API.',
      'error.storage_signed_url': 'Ocorreu um erro ao criar o URL assinado.',
      'error.storage_upload': 'Ocorreu um erro ao enviar para S3.'
    }
  }
};

/**
 * Initializes i18n object
 * @type {Object}
 */
exports.init = (language) =>
  i18n.init({
    lng: language,
    resources: localeResources
  });
