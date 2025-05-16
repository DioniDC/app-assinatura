import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Modal, FlatList, Button, ScrollView
} from 'react-native';
import FiltroVendas, { FiltrosVendas, Venda } from './FiltroVendas';
import axios from 'axios';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ComprasScreen() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const route = useRoute();
  const apenasAssinados = (route.params as { apenasAssinados?: boolean })?.apenasAssinados ?? false;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filtros, setFiltros] = useState<FiltrosVendas>({ qtd: 10 });
  const [pdvPadrao, setPdvPadrao] = useState<string | undefined>();
  const ultimaVendaAssinadaRef = useRef<Venda | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');

  useEffect(() => {
    const carregarPdv = async () => {
      const pdv = await AsyncStorage.getItem('pdv');
      const urlSalva = await AsyncStorage.getItem('apiUrl');
      if (urlSalva) setApiUrl(urlSalva);
      if (pdv) setPdvPadrao(pdv);
    };
    carregarPdv();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (vendas.length > 0) {
        setModalVisible(true);
        ultimaVendaAssinadaRef.current = null;
      }
    }, [vendas])
  );

  const buscarVendas = async (filtros: FiltrosVendas) => {
    setVendas([]);
    setModalVisible(false);

    try {
      setLoading(true);

      const filtrosAtualizados = {
        ...filtros,
        verifica_promissoria: apenasAssinados ? true : filtros.verifica_promissoria,
      };

      const response = await axios.get(`${apiUrl}/conrec`, {
        params: filtrosAtualizados,
      });

      setVendas(response.data);
      setModalVisible(true);
    } catch (err: any) {
      if (err.response?.status === 404) {
        Alert.alert('', 'Nenhum venda encontrada');
      } else {
        Alert.alert('Erro', 'Erro ao buscar vendas');
      }
    } finally {
      setLoading(false);
    }
  };

  const gerarPdf = async (venda: Venda) => {
    try {
      const payload = {
        valor: venda.VALOR60,
        codcli: String(venda.CODCLI60),
        filial: String(venda.CODFIL60),
        datavenc: venda.DATVENC60,
        numero_cupom: String(venda.NUMDOC60),
        data_compra: venda.DATEMIS60,
        data_emissao: venda.DATEMIS60,
        base64_output: true,
      };

      const res = await axios.post(
        `${apiUrl}/docs/nota-promissoria?base64_output=true`,
        payload
      );

      const base64 = res.data.base64;
      const pdfUrl = `data:application/pdf;base64,${base64}`;
      const nomeArquivo = `${venda.CODFIL60}_${venda.CODCLI60}_${venda.NCAIXA60}_${venda.NUMDOC60}.png`;
      ultimaVendaAssinadaRef.current = venda;

      navigation.navigate('Assinatura', {
        pdfUrl,
        venda,
        nomeArquivo,
      });
    } catch (err: any) {
      Alert.alert('Erro', 'Erro ao gerar PDF');
    }
  };

  const handleItemPress = async (venda: Venda) => {
    if (venda.NOTAPROMIS) {
      try {
        setLoading(true);
        const nomeArquivo = `${venda.CODFIL60}_${venda.CODCLI60}_${venda.NCAIXA60}_${venda.NUMDOC60}.png`;

        const res = await axios.get(`${apiUrl}/docs/nota-promissoria/assinada`, {
          params: { nome_arquivo: nomeArquivo },
        });

        const imagemBase64 = res.data.base64;
        const pdfUrl = `data:image/png;base64,${imagemBase64}`;

        setModalVisible(false);

        navigation.navigate('VisualizarAssinado', { pdfUrl, nomeArquivo });
      } catch (err) {
        Alert.alert('Erro', 'Erro ao buscar assinatura já feita.');
      } finally {
        setLoading(false);
      }
    } else {
      gerarPdf(venda);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <FiltroVendas
          onBuscar={buscarVendas}
          loading={loading}
          pdvInicial={pdvPadrao}
          permitirAlterarPdv={apenasAssinados}
        />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Últimas 10 vendas</Text>

          <FlatList
            data={vendas}
            keyExtractor={(item) => `${item.LANSAI60}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleItemPress(item)}
                style={[styles.item, item.NOTAPROMIS && styles.assinado]}
              >
                <Text style={styles.bold}>Cupom: {item.CUPOM60}</Text>
                <Text>Filial: {item.CODFIL60}</Text>
                <Text>Pdv: {item.NCAIXA60}</Text>
                <Text>Valor: R$ {item.VALOR60.toFixed(2)}</Text>
                <Text>Data: {new Date(item.DATEMIS60).toLocaleDateString('pt-BR')}</Text>
                <Text>Cliente: {item.NOME60}</Text>
                {item.NOTAPROMIS && <Text style={styles.assinadoText}>✓ Assinado</Text>}
              </TouchableOpacity>
            )}
          />

          <Button
            title="Fechar"
            onPress={() => {
              setModalVisible(false);
              setVendas([]);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  item: { backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 6 },
  assinado: { backgroundColor: '#e0f7fa' },
  bold: { fontWeight: 'bold' },
  assinadoText: { color: 'green', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#777' },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});
