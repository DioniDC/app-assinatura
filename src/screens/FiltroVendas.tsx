import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Modal,
  FlatList, TouchableOpacity, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

export default function FiltroVendas({ onBuscar, loading: propLoading = false }: FiltroVendasProps) {
  const [filtros, setFiltros] = useState<FiltrosVendas>({ qtd: 10 });
  const [nomeCliente, setNomeCliente] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = propLoading || internalLoading;
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const url = await AsyncStorage.getItem('apiUrl');
        const pdv = await AsyncStorage.getItem('pdv');
        const filial = await AsyncStorage.getItem('filial');

        if (url) setApiUrl(url);
        setFiltros(prev => ({
          ...prev,
          pdv: pdv || '',
          filial: filial || '',
        }));
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    carregarConfiguracoes();
  }, []);

  const handleBuscarVendas = async () => {
    try {
      const filtrosParaEnviar: FiltrosVendas = {
        ...filtros,
        qtd: filtros.qtd || 10,
        verifica_promissoria: filtros.verifica_promissoria ?? false
      };

      if (onBuscar) {
        onBuscar(filtrosParaEnviar);
      } else {
        setInternalLoading(true);
        const res = await axios.get(`${apiUrl}/conrec`, {
          params: filtrosParaEnviar
        });
        console.log('Resultados da busca:', res.data);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      alert('Erro ao buscar vendas');
    } finally {
      setInternalLoading(false);
    }
  };

  const buscarClientes = async () => {
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
    } catch (err) {
      alert('Erro ao buscar clientes');
      console.error(err);
    } finally {
      setLoadingClientes(false);
    }
  };

  const selecionarCliente = (cliente: Cliente) => {
    setFiltros({ ...filtros, codigocliente: cliente.CODCLI10 });
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filial:</Text>
      <View style={styles.fixoCurto}>
        <Text style={styles.fixoText}>{filtros.filial || '—'}</Text>
      </View>

      <Text style={styles.label}>PDV:</Text>
      {filtros.pdv ? (
        <View style={styles.fixoCurto}>
          <Text style={styles.fixoText}>{filtros.pdv}</Text>
        </View>
      ) : (
        <TextInput
          style={styles.inputCurto}
          value={filtros.pdv}
          onChangeText={(text) => setFiltros({ ...filtros, pdv: text.replace(/[^0-9]/g, '') })}
          keyboardType="numeric"
          placeholder="PDV"
          maxLength={3}
        />
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
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flex1]}
          placeholder="Digite o nome do cliente (Ex: JOAO)"
          value={nomeCliente}
          onChangeText={setNomeCliente}
        />
        <Button title="Buscar" onPress={buscarClientes} disabled={loadingClientes} />
      </View>

      {loadingClientes && <ActivityIndicator style={styles.loading} />}
      {filtros.codigocliente && (
        <Text style={styles.clienteSelecionado}>Cliente selecionado: {filtros.codigocliente}</Text>
      )}

      <Button title="Buscar Vendas " onPress={handleBuscarVendas} disabled={loading} />
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
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  label: { fontWeight: 'bold', marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex1: { flex: 1 },
  clienteSelecionado: { fontStyle: 'italic', color: '#2c3e50' },
  modalContainer: { flex: 1, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  clienteItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  clienteCodigo: { fontWeight: 'bold', color: '#3498db' },
  clienteNome: { color: '#555' },
  loading: { marginVertical: 10 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#777' },
  fixoCurto: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#eee',
    width: 80,
    alignItems: 'center',
  },
  inputCurto: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#fff',
    width: 80,
  },
  fixoText: {
    color: '#333',
    fontWeight: 'bold',
  }
});
