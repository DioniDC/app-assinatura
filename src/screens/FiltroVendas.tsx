import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Modal,
  FlatList, TouchableOpacity, ActivityIndicator,
  Alert
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keyboard } from 'react-native';

export interface Cliente {
  CODCLI10: string;
  RAZSOC10: string;
}

export interface Venda {
  CODCLI60: number;
  CUPOM60: number;
  DATEMIS60: string;
  VALOR60: number;
  NOTAPROMIS: boolean;
  NOME60: string;
  CODFIL60: number;
  NUMDOC60: number;
  NCAIXA60: number;
}

export interface FiltrosVendas {
  filial?: string;
  pdv?: string;
  codigocliente?: string;
  documento?: string;
  verifica_promissoria?: boolean;
  qtd?: number;
}

export interface FiltroVendasProps {
  onBuscar?: (filtros: FiltrosVendas) => void;
  loading?: boolean;
  pdvInicial?: string;
  permitirAlterarPdv?: boolean;
}

export default function FiltroVendas({
  onBuscar,
  loading: propLoading = false,
  pdvInicial,
  permitirAlterarPdv = false
}: FiltroVendasProps) {
  const [filtros, setFiltros] = useState<FiltrosVendas>({ qtd: 10 });
  const [nomeCliente, setNomeCliente] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = propLoading || internalLoading;
  const limparCliente = () => {
    setFiltros({ ...filtros, codigocliente: undefined });
    setNomeCliente('');
  };
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const url = await AsyncStorage.getItem('apiUrl');
        const filial = await AsyncStorage.getItem('filial');

        if (url) setApiUrl(url);
        setFiltros(prev => ({
          ...prev,
          pdv: pdvInicial ?? prev.pdv ?? '',
          filial: filial || ''
        }));
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    carregarConfiguracoes();
  }, [pdvInicial]);

  const handleBuscarVendas = async () => {
    try {
      const filtrosParaEnviar: FiltrosVendas = {
        filial: filtros.filial,
        pdv: filtros.pdv || undefined,
        codigocliente: filtros.codigocliente || undefined,
        documento: filtros.documento?.trim() || undefined,
        qtd: filtros.qtd || 10
      };
      console.log(filtrosParaEnviar);
      
      if (onBuscar) {
        onBuscar(filtrosParaEnviar);
      } else {
        setInternalLoading(true);
        const res = await axios.get(`${apiUrl}/conrec`, {
          params: filtrosParaEnviar
        });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        Alert.alert('', 'Nenhum venda encontrada');
      } else {
        Alert.alert('Erro', 'Erro ao buscar vendas');
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const buscarClientes = async () => {
    Keyboard.dismiss();
    if (!nomeCliente.trim()) {
      alert('Digite um nome para buscar');
      return;
    }
  
    try {
      setLoadingClientes(true);
      const res = await axios.get(`${apiUrl}/cadcli/`, {
        params: { nome: nomeCliente.trim(), limit: 10 }
      });
      setClientes(res.data);
      setModalVisible(true);
    } catch (err: any) {
      if (err.response?.status === 404) {
        Alert.alert('', 'Nenhum cliente encontrado');
      } else {
        Alert.alert('Erro', 'Erro ao buscar clientes');
      }
    } finally {
      setLoadingClientes(false);
    }
  };
  
  const selecionarCliente = (cliente: Cliente) => {
    setFiltros({ ...filtros, codigocliente: cliente.CODCLI10 });
    setNomeCliente(cliente.RAZSOC10);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filial:</Text>
      <View style={styles.fixoCurto}>
        <Text style={styles.fixoText}>{filtros.filial || '—'}</Text>
      </View>

      <Text style={styles.label}>PDV:</Text>
      {permitirAlterarPdv ? (
        <TextInput
          style={styles.inputCurto}
          value={filtros.pdv}
          onChangeText={(text) => setFiltros({ ...filtros, pdv: text.replace(/[^0-9]/g, '') })}
          keyboardType="numeric"
          placeholder="PDV"
          maxLength={3}
        />
      ) : (
        <TouchableOpacity
          style={styles.fixoCurto}
          onPress={() => alert('Opcao apenas para PDV configurado!')}
        >
          <Text style={styles.fixoText}>{filtros.pdv || '—'}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Documento:</Text>
      <TextInput
        style={styles.input}
        value={filtros.documento}
        onChangeText={(text) => setFiltros({ ...filtros, documento: text.replace(/[^0-9]/g, '') })}
        keyboardType="numeric"
        placeholder="Ex: 53999"
      />

<Text style={styles.label}>Cliente:</Text>
{!filtros.codigocliente ? (
  <View style={styles.row}>
    <TextInput
      style={[styles.input, styles.flex1]}
      placeholder="Digite o nome do cliente (Ex: JOAO)"
      value={nomeCliente}
      onChangeText={setNomeCliente}
    />
    <Button title="Buscar" onPress={buscarClientes} disabled={loadingClientes} />
  </View>
) : (
  <>
    <View style={styles.selecionadoBox}>
      <View style={styles.selecionadoHeader}>
        <Text style={styles.selecionadoLabel}>Cliente selecionado:</Text>
        <TouchableOpacity onPress={limparCliente}>
          <Text style={styles.limparTexto}>❌</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.selecionadoValor}>
        {filtros.codigocliente} - {nomeCliente}
      </Text>
    </View>
    <View style={{ height: 20 }} />
  </>
)}

      {loadingClientes && <ActivityIndicator style={styles.loading} />}

      <Button title="Buscar Vendas" onPress={handleBuscarVendas} disabled={loading} />
      {loading && <ActivityIndicator style={styles.loading} />}

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Selecione um cliente</Text>
          <FlatList
            data={clientes}
            keyExtractor={(item) => item.CODCLI10}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => selecionarCliente(item)}>
                <View style={styles.clienteItem}>
                  <Text style={styles.clienteCodigo}>{item.CODCLI10}</Text>
                  <Text style={styles.clienteNome}>{item.RAZSOC10}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum cliente encontrado</Text>}
          />
          <Button title="Fechar" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10, backgroundColor: '#f5f5f5' },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10,
    borderRadius: 6, marginBottom: 10, backgroundColor: '#fff'
  },
  label: { fontWeight: 'bold', marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex1: { flex: 1 },
  checkboxContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  clienteSelecionado: { fontStyle: 'italic', color: '#2c3e50' },
  modalContainer: { flex: 1, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  clienteItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  clienteCodigo: { fontWeight: 'bold', color: '#3498db' },
  clienteNome: { color: '#555' },
  loading: { marginVertical: 10 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#777' },
  inputCurto: {
    borderWidth: 1, borderColor: '#ccc', padding: 10,
    borderRadius: 6, marginBottom: 10, backgroundColor: '#fff', width: 80
  },
  fixoCurto: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 6,
    padding: 10, marginBottom: 10, backgroundColor: '#eee',
    width: 80, alignItems: 'center'
  },
  fixoText: { color: '#333', fontWeight: 'bold' },
  selecionadoBox: {
    backgroundColor: '#d0f0ff',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  selecionadoLabel: {
    fontWeight: 'bold',
    color: '#0077aa',
  },
  selecionadoValor: {
    fontStyle: 'italic',
    color: '#003344',
  },
  selecionadoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limparTexto: {
    color: '#c00',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  
});
