import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import axios from 'axios';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AssinaturaScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { pdfUrl, venda, nomeArquivo  } = route.params as any;
  const [apiUrl, setApiUrl] = useState<string>('');
  const isImage = pdfUrl.endsWith('.png') || pdfUrl.startsWith('http');
  if (isImage) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Image
          source={{ uri: pdfUrl }}
          style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
        />
      </View>
    );
  }
  useEffect(() => {
    const carregarApiUrl = async () => {
      const urlSalva = await AsyncStorage.getItem('apiUrl');
      if (urlSalva) setApiUrl(urlSalva);
    };
  
    carregarApiUrl();
  }, []);
  const webViewRef = useRef<WebView>(null);
  const messageHandlerRef = useRef<((data: any) => void) | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSignature = async () => {
    try {
      setIsSaving(true);

      const signatureDataUrl = await new Promise<string>((resolve) => {
        messageHandlerRef.current = (data) => {
          if (data.type === 'signature') {
            resolve(data.data);
            messageHandlerRef.current = null;
          }
        };

        webViewRef.current?.injectJavaScript(`
          (function() {
            const canvas = document.getElementById('drawingCanvas');
            const dataUrl = canvas.toDataURL('image/png');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'signature',
              data: dataUrl
            }));
          })();
        `);
      });

      if (!signatureDataUrl) {
        throw new Error('Não foi possível capturar a assinatura');
      }

      const signedPdfDataUrl = await new Promise<string>((resolve) => {
        messageHandlerRef.current = (data) => {
          if (data.type === 'combinedPdf') {
            resolve(data.data);
            messageHandlerRef.current = null;
          }
        };

        webViewRef.current?.injectJavaScript(`
          (function() {
            setTimeout(() => {
              const pdfCanvas = document.getElementById('pdfCanvas');
              const signatureCanvas = document.getElementById('drawingCanvas');
              
              const combinedCanvas = document.createElement('canvas');
              combinedCanvas.width = pdfCanvas.width;
              combinedCanvas.height = pdfCanvas.height;

              const ctx = combinedCanvas.getContext('2d');
              ctx.drawImage(pdfCanvas, 0, 0, pdfCanvas.width, pdfCanvas.height);
              ctx.drawImage(signatureCanvas, 0, 0, signatureCanvas.width, signatureCanvas.height);

              const dataUrl = combinedCanvas.toDataURL('image/png');

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'combinedPdf',
                data: dataUrl
              }));
            }, 500);
          })();
        `);
      });

      if (!signedPdfDataUrl) {
        throw new Error('Não foi possível combinar PDF e assinatura');
      }

      const formData = new FormData();
      formData.append('arquivo', {
        uri: signedPdfDataUrl,
        name: nomeArquivo,
        type: 'image/png',
      } as any);

      formData.append('vendaId', venda.id);

      await axios.post(`${apiUrl}/docs/nota-promissoria/salvar-png`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Sucesso', 'Documento assinado salvo com sucesso!');
      navigation.navigate('Home');
    } catch (err: any) {
      Alert.alert('Erro', 'Erro ao salvar documento assinado: ' + (err.message || 'Erro desconhecido'));
      console.error('Erro detalhado:', err.response?.data || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSigning = () => {
    setIsSigning(!isSigning);
    webViewRef.current?.injectJavaScript(`
      document.getElementById('drawingCanvas').style.pointerEvents = '${!isSigning ? 'auto' : 'none'}';
      if (${isSigning}) {
        const ctx = document.getElementById('drawingCanvas').getContext('2d');
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      }
    `);
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          #pdfContainer {
            position: relative;
            width: 100%;
            height: 100%;
          }
          #pdfCanvas, #drawingCanvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          #pdfCanvas {
            z-index: 1;
          }
          #drawingCanvas {
            z-index: 2;
            pointer-events: none;
            background-color: transparent;
          }
        </style>
      </head>
      <body>
        <div id="pdfContainer">
          <canvas id="pdfCanvas"></canvas>
          <canvas id="drawingCanvas"></canvas>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.min.js"></script>
        <script>
          const base64 = "${pdfUrl.replace("data:application/pdf;base64,", "")}";
          const raw = atob(base64);
          const uint8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) {
            uint8Array[i] = raw.charCodeAt(i);
          }

          const pdfCanvas = document.getElementById('pdfCanvas');
          const drawingCanvas = document.getElementById('drawingCanvas');
          const pdfCtx = pdfCanvas.getContext('2d');
          const drawCtx = drawingCanvas.getContext('2d');

          let isDrawing = false;
          let lastX = 0;
          let lastY = 0;

          pdfjsLib.getDocument(uint8Array).promise
            .then(pdf => pdf.getPage(1))
            .then(page => {
              const container = document.getElementById('pdfContainer');
              const scale = Math.min(container.clientWidth / page.getViewport({ scale: 1 }).width,
                                     container.clientHeight / page.getViewport({ scale: 1 }).height);
              const viewport = page.getViewport({ scale });

              pdfCanvas.width = viewport.width;
              pdfCanvas.height = viewport.height;
              drawingCanvas.width = viewport.width;
              drawingCanvas.height = viewport.height;

              page.render({ canvasContext: pdfCtx, viewport });

              drawingCanvas.addEventListener('mousedown', startDrawing);
              drawingCanvas.addEventListener('mousemove', draw);
              drawingCanvas.addEventListener('mouseup', stopDrawing);
              drawingCanvas.addEventListener('mouseout', stopDrawing);

              drawingCanvas.addEventListener('touchstart', handleTouchStart);
              drawingCanvas.addEventListener('touchmove', handleTouchMove);
              drawingCanvas.addEventListener('touchend', handleTouchEnd);
            });

          function getPosition(e) {
            const rect = drawingCanvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            const scaleX = drawingCanvas.width / rect.width;
            const scaleY = drawingCanvas.height / rect.height;
            return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
          }

          function startDrawing(e) {
            isDrawing = true;
            const pos = getPosition(e);
            [lastX, lastY] = [pos.x, pos.y];
          }

          function draw(e) {
            if (!isDrawing) return;
            const pos = getPosition(e);
            drawCtx.beginPath();
            drawCtx.moveTo(lastX, lastY);
            drawCtx.lineTo(pos.x, pos.y);
            drawCtx.strokeStyle = '#000';
            drawCtx.lineWidth = 2;
            drawCtx.lineCap = 'round';
            drawCtx.stroke();
            [lastX, lastY] = [pos.x, pos.y];
          }

          function stopDrawing() {
            isDrawing = false;
          }

          function handleTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            drawingCanvas.dispatchEvent(new MouseEvent('mousedown', {
              clientX: touch.clientX,
              clientY: touch.clientY,
            }));
          }

          function handleTouchMove(e) {
            e.preventDefault();
            const touch = e.touches[0];
            drawingCanvas.dispatchEvent(new MouseEvent('mousemove', {
              clientX: touch.clientX,
              clientY: touch.clientY,
            }));
          }

          function handleTouchEnd(e) {
            e.preventDefault();
            drawingCanvas.dispatchEvent(new MouseEvent('mouseup'));
          }
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        style={styles.webview}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (messageHandlerRef.current) {
              messageHandlerRef.current(message);
            }
          } catch (e) {
            console.error('Erro ao interpretar mensagem da WebView:', e);
          }
        }}
      />
      {!isSigning ? (
        <TouchableOpacity
          style={[styles.button, styles.signButton]}
          onPress={toggleSigning}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>✍️ Assinar Documento</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveSignature}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    elevation: 4,
    minWidth: width * 0.4,
    alignItems: 'center',
  },
  signButton: {
    backgroundColor: '#4CAF50',
    margin: 20,
    alignSelf: 'center',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
