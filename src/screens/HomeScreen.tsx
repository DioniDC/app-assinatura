import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Image,
  Animated,
  Easing
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const [ultimaVenda, setUltimaVenda] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [pdv, setPdv] = useState('');
  const [filial, setFilial] = useState('');
  const [rotateAnim] = useState(new Animated.Value(0));

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();

  const carregarConfiguracoes = async () => {
    try {
      const url = await AsyncStorage.getItem('apiUrl');
      const pdvArmazenado = await AsyncStorage.getItem('pdv');
      const filialArmazenada = await AsyncStorage.getItem('filial');

      if (url) setApiUrl(url);
      if (pdvArmazenado) setPdv(pdvArmazenado);
      if (filialArmazenada) setFilial(filialArmazenada);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  useEffect(() => {
    carregarConfiguracoes();
    SystemUI.setBackgroundColorAsync('transparent');
  }, []);

  useEffect(() => {
    if (apiUrl && pdv && filial) {
      buscarUltimaVenda();
    }
  }, [apiUrl, pdv, filial]);

  useFocusEffect(
    useCallback(() => {
      if (apiUrl && pdv && filial) {
        buscarUltimaVenda();
      }
    }, [apiUrl, pdv, filial]),
  );

  const startRotation = () => {
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  };

  const buscarUltimaVenda = async () => {
    try {
      setLoading(true);
      startRotation();
      console.log(`${apiUrl}/conrec`);
      const res = await axios.get(`${apiUrl}/conrec`, {
        params: { filial, pdv, qtd: 1 },
      });

      const venda = res.data?.[0] ?? null;
      setUltimaVenda(venda);

      const agora = new Date();
      const formatada =
        agora.toLocaleDateString('pt-BR') +
        ' ' +
        agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setUltimaAtualizacao(formatada);
    } catch (err) {
      console.error('Erro ao buscar última venda:', err);
      Alert.alert('Erro', 'Não foi possível conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const gerarPdf = async (venda: any) => {
    try {
      const payload = {
        valor: venda.VALOR60,
        codcli: String(venda.CODCLI60),
        filial: String(venda.CODFIL60),
        datavenc: venda.DATVENC60,
        numero_cupom: String(venda.NUMDOC60),
        data_compra: venda.DATEMIS60,
        data_emissao: venda.DATEMIS60,
      };

      const res = await axios.post(`${apiUrl}/docs/nota-promissoria?base64_output=true`, payload);
      const base64 = res.data.base64;

      const pdfUrl = `data:application/pdf;base64,${base64}`;
      const nomeArquivo = `${venda.CODFIL60}_${venda.CODCLI60}_${venda.NCAIXA60}_${venda.NUMDOC60}.png`;
      navigation.navigate('Assinatura', { pdfUrl, venda, nomeArquivo });
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      Alert.alert('Erro', 'Falha ao gerar o documento');
    }
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    
    <ImageBackground 
      source={require('../../assets/background.jpg')} 
      style={styles.background}
      blurRadius={2}
    >
      
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.appTitle}>Assinatura Digital</Text>
          <Text style={styles.appSubtitle}>Gestão de Notas Promissórias</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Última Venda</Text>
            <TouchableOpacity onPress={buscarUltimaVenda}>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <Icon name="refresh" size={28} color="#4A90E2" />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
            </View>
          ) : ultimaVenda ? (
            <>
              {ultimaAtualizacao && (
                <Text style={styles.updateText}>Atualizado: {ultimaAtualizacao}</Text>
              )}
              
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={async () => {
                  try {
                    if (ultimaVenda.NOTAPROMIS) {
                      setLoading(true);
                      const nomeArquivo = `${ultimaVenda.CODFIL60}_${ultimaVenda.CODCLI60}_${ultimaVenda.NCAIXA60}_${ultimaVenda.NUMDOC60}.png`;
                    
                      const res = await axios.get(`${apiUrl}/docs/nota-promissoria/assinada`, {
                        params: { nome_arquivo: nomeArquivo },
                      });
                    
                      const imagemBase64 = res.data.base64;
                      const pdfUrl = `data:image/png;base64,${imagemBase64}`;
                    
                      navigation.navigate('VisualizarAssinado', { pdfUrl, nomeArquivo });
                    } else {
                      gerarPdf(ultimaVenda);
                    }
                  } catch (err) {
                    Alert.alert('Erro', 'Não foi possível carregar o documento');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <View style={styles.saleInfo}>
                  <View style={styles.clientInfo}>
                    <Icon name="person" size={20} color="#555" />
                    <Text style={styles.clientText}>{ultimaVenda.NOME60}</Text>
                  </View>
                  <Text style={styles.clientId}>ID: {ultimaVenda.CODCLI60}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="receipt" size={18} color="#777" />
                  <Text style={styles.detailText}>Cupom: {ultimaVenda.NUMDOC60}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="point-of-sale" size={18} color="#777" />
                  <Text style={styles.detailText}>PDV: {ultimaVenda.NCAIXA60}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="calendar-today" size={18} color="#777" />
                  <Text style={styles.detailText}>Data: {new Date(ultimaVenda.DATEMIS60).toLocaleDateString('pt-BR')}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="event-available" size={18} color="#777" />
                  <Text style={styles.detailText}>Vencimento: {new Date(ultimaVenda.DATVENC60).toLocaleDateString('pt-BR')}</Text>
                </View>

                <LinearGradient
                  colors={['#f5f7fa', '#c3cfe2']}
                  style={styles.amountContainer}
                >
                  <Text style={styles.amountLabel}>Valor Total</Text>
                  <Text style={styles.amountValue}>R$ {parseFloat(ultimaVenda.VALOR60).toFixed(2)}</Text>
                </LinearGradient>

                <View style={[
                  styles.statusContainer,
                  ultimaVenda.NOTAPROMIS ? styles.signedStatus : styles.pendingStatus
                ]}>
                  <Icon 
                    name={ultimaVenda.NOTAPROMIS ? "check-circle" : "edit"} 
                    size={20} 
                    color={ultimaVenda.NOTAPROMIS ? "#4CAF50" : "#FF9800"} 
                  />
                  <Text style={styles.statusText}>
                    {ultimaVenda.NOTAPROMIS ? 'Documento assinado' : 'Aguardando assinatura'}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="receipt" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma venda encontrada</Text>
              <Text style={styles.emptySubtext}>Toque no ícone de atualização para buscar</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Compras', { apenasAssinados: false })}
          >
            <LinearGradient
              colors={['#4A90E2', '#6B52AE']}
              style={styles.gradientButton}
            >
              <Icon name="search" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Buscar Vendas</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Assinados', { apenasAssinados: true })}
          >
            <LinearGradient
              colors={['#FF7B25', '#FF5E62']}
              style={styles.gradientButton}
            >
              <Icon name="assignment" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Documentos Assinados</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Versão 1.0.0</Text>
          <Text style={styles.footerText}>© Dioni Dias Cordeiro</Text>
        </View>
      </ScrollView> 
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginBottom: 10,
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  clientId: {
    fontSize: 14,
    color: '#777',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 10,
  },
  amountContainer: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  signedStatus: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  pendingStatus: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  actionsContainer: {
    marginTop: 10,
  },
  actionButton: {
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});