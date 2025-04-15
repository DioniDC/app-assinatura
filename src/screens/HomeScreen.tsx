import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';

export default function HomeScreen() {
  const [ultimaVenda, setUltimaVenda] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [pdv, setPdv] = useState('');
  const [filial, setFilial] = useState('');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();

  useEffect(() => {
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
    carregarConfiguracoes();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (apiUrl && pdv && filial) {
        buscarUltimaVenda();
      }
    }, [apiUrl, pdv, filial]),
  );

  const buscarUltimaVenda = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/conrec`, {
        params: { filial, pdv, qtd: 1 },
      });
      setUltimaVenda(res.data[0]);

      const agora = new Date();
      const formatada =
        agora.toLocaleDateString('pt-BR') +
        ' ' +
        agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setUltimaAtualizacao(formatada);
    } catch (err) {
      Alert.alert('Erro', 'Erro ao buscar última venda');
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
      const nomeArquivo = `${venda.CODCLI60}_${venda.NCAIXA60}_${venda.NUMDOC60}.png`;
      navigation.navigate('Assinatura', { pdfUrl, venda, nomeArquivo });
    } catch (err: any) {
      Alert.alert('Erro', 'Erro ao gerar PDF');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Última Venda</Text>
        <TouchableOpacity onPress={buscarUltimaVenda} style={styles.refreshIconButton}>
          <Text style={styles.refreshIconText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : ultimaVenda ? (
        <>
          {ultimaAtualizacao && (
            <Text style={styles.dataAtualizacao}>Última atualização: {ultimaAtualizacao}</Text>
          )}
          <View style={styles.noteCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={async () => {
                try {
                  if (ultimaVenda.NOTAPROMIS) {
                    setLoading(true);
                    const nomeArquivo = `${ultimaVenda.CODCLI60}_${ultimaVenda.NCAIXA60}_${ultimaVenda.NUMDOC60}.png`;
                  
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
                  Alert.alert('Erro', 'Erro ao carregar assinatura.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <Text style={styles.noteTitle}>Cliente: {ultimaVenda.CODCLI60}</Text>
              <Text style={styles.noteTitle}>{ultimaVenda.NOME60}</Text>
              <Text style={[styles.noteDetail, { fontFamily: 'monospace' }]}>Valor.....: R$ {ultimaVenda.VALOR60}</Text>
              <Text style={[styles.noteDetail, { fontFamily: 'monospace' }]}>Pdv.......: {ultimaVenda.NCAIXA60}</Text>
              <Text style={[styles.noteDetail, { fontFamily: 'monospace' }]}>Cupom.....: {ultimaVenda.NUMDOC60}</Text>
              <Text style={[styles.noteDetail, { fontFamily: 'monospace' }]}>Data......: {new Date(ultimaVenda.DATEMIS60).toLocaleDateString('pt-BR')}</Text>
              <Text style={[styles.noteDetail, { fontFamily: 'monospace' }]}>Vencimento: {new Date(ultimaVenda.DATVENC60).toLocaleDateString('pt-BR')}</Text>
            
              <Text style={ultimaVenda.NOTAPROMIS ? styles.assinadoText : styles.cliqueAssinarText}>
                {ultimaVenda.NOTAPROMIS ? '✅ Esta venda já foi assinada!' : '🖋️ Clique para assinar esta venda'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text>Nenhuma venda encontrada.</Text>
      )}

      <TouchableOpacity style={[styles.button, { backgroundColor: '#2196F3' }]} onPress={() => navigation.navigate('Compras', { apenasAssinados: false })}>
        <Text style={styles.buttonText}>🔍 Buscar Outras Vendas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#9C27B0' }]} onPress={() => navigation.navigate('Assinados', { apenasAssinados: true })}>
        <Text style={styles.buttonText}>📄 Consultar Assinados</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  refreshIconButton: {
    marginLeft: 10,
    padding: 4,
  },
  refreshIconText: {
    fontSize: 26,
  },
  container: {
    padding: 20,
    backgroundColor: '#f0f8ff',
    flexGrow: 1,
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 20,
    color: '#333',
    textAlign: 'center',
  },
  noteCard: {
    width: '100%',
    backgroundColor: '#fffacd',
    padding: 20,
    borderRadius: 10,
    borderColor: '#f7d560',
    borderWidth: 2,
    marginBottom: 20,
  },
  noteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  noteDetail: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  assinadoText: {
    marginTop: 10,
    fontWeight: 'bold',
    color: 'green',
    fontSize: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: 350,
    alignSelf: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataAtualizacao: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  cliqueAssinarText: {
    marginTop: 10,
    fontWeight: 'bold',
    color: '#0077cc',
    fontSize: 16,
    textAlign: 'center',
  },
});
