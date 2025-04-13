import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Modal, FlatList, Button, ScrollView
} from 'react-native';
import FiltroVendas, { FiltrosVendas, Venda } from './FiltroVendas';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/StackNavigator';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// dentro do seu componente:
const API_BASE = 'https://60ed-191-7-190-140.ngrok-free.app';

export default function ComprasScreen() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const route = useRoute();
  const apenasAssinados = (route.params as { apenasAssinados?: boolean })?.apenasAssinados ?? false;  
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filtros, setFiltros] = useState<FiltrosVendas>({ qtd: 10 });
  const [pdvPadrao, setPdvPadrao] = useState<string | undefined>();

  useEffect(() => {
    const carregarPdv = async () => {
      const pdv = await AsyncStorage.getItem('pdv');
      if (pdv) setPdvPadrao(pdv);
    };
    carregarPdv();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (vendas.length > 0) {
        setModalVisible(true);
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
  
      const response = await axios.get(`${API_BASE}/conrec`, {
        params: filtrosAtualizados,
      });
  
      setVendas(response.data);
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao buscar vendas');
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
        base64_output: true,
      };

      const res = await axios.post(
        `${API_BASE}/docs/nota-promissoria?base64_output=true`,
        payload
      );

      const base64 = res.data.base64;
      const pdfUrl = `data:application/pdf;base64,${base64}`;
      const nomeArquivo = `${venda.CODCLI60}_${venda.NCAIXA60}_${venda.NUMDOC60}.png`;

      navigation.navigate('Assinatura', { pdfUrl, venda, nomeArquivo });
    } catch (err: any) {
      console.log('Erro ao gerar PDF:', err?.response?.data || err.message);
      Alert.alert('Erro', 'Erro ao gerar PDF');
    }
  };

  const handleItemPress = async (venda: Venda) => {
    if (venda.NOTAPROMIS) {
      try {
        setLoading(true);
        const nomeArquivo = `${venda.CODCLI60}_${venda.NCAIXA60}_${venda.NUMDOC60}.png`;
  
        const res = await axios.get(`${API_BASE}/docs/nota-promissoria/assinada`, {
          params: { nome_arquivo: nomeArquivo },
        });
  
        const imagemBase64 = res.data.base64;
        const pdfUrl = `data:image/png;base64,${imagemBase64}`;
  
        // Fecha somente o modal ao navegar
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

      {/* Modal com resultados da busca */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Resultados da Busca</Text>

          <FlatList
            data={vendas}
            keyExtractor={(item) => item.CUPOM60.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleItemPress(item)}
                style={[styles.item, item.NOTAPROMIS && styles.assinado]}
              >
                <Text style={styles.bold}>Cupom: {item.CUPOM60}</Text>
                <Text>Filail: {item.CODFIL60}</Text>
                <Text>Valor: R$ {item.VALOR60.toFixed(2)}</Text>
                <Text>Data: {new Date(item.DATEMIS60).toLocaleDateString('pt-BR')}</Text>
                <Text>Cliente: {item.NOME60}</Text>
                {item.NOTAPROMIS && <Text style={styles.assinadoText}>✓ Assinado</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhuma venda encontrada</Text>
            }
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
