import React, { useState } from 'react';
import axios from 'axios';

import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';

type FiltrosVenda = {
  filial?: string;
  qtd?: number;
  pdv?: string;
  cliente?: string;
  cupom?: string;
};

type FiltroVendasProps = {
  onBuscar: (filtros: FiltrosVenda) => void;
};

export default function FiltroVendas({ onBuscar }: FiltroVendasProps) {
  const [filial, setFilial] = useState('');
  const [qtd, setQtd] = useState('1');
  const [pdv, setPdv] = useState('');
  const [cliente, setCliente] = useState('');
  const [cupom, setCupom] = useState('');
  const [listaClientes, setListaClientes] = useState<any[]>([]);

  const buscarClientes = async () => {
    try {
      const res = await axios.get(`https://seu-endpoint/clientes?nome=${cliente}`);
      setListaClientes(res.data);
    } catch {
      alert('Erro ao buscar clientes');
    }
  };

  return (
    <View>
      <Text>Filial</Text>
      <TextInput style={styles.input} value={filial} onChangeText={setFilial} keyboardType="numeric" />

      <Text>Qtd</Text>
      <TextInput style={styles.input} value={qtd} onChangeText={setQtd} keyboardType="numeric" />

      <Text>PDV</Text>
      <TextInput style={styles.input} value={pdv} onChangeText={setPdv} keyboardType="numeric" />

      <Text>Cliente</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput style={[styles.input, { flex: 1 }]} value={cliente} onChangeText={setCliente} />
        <Button title="Buscar" onPress={buscarClientes} />
      </View>

      {listaClientes.length > 0 && (
        <FlatList
          data={listaClientes}
          keyExtractor={(item) => item.CODCLI.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => {
              setCliente(item.CODCLI.toString());
              setListaClientes([]);
            }}>
              <Text style={styles.clienteItem}>{item.NOME}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Text>Cupom</Text>
      <TextInput style={styles.input} value={cupom} onChangeText={setCupom} keyboardType="numeric" />

      <Button
        title="🔍 Buscar"
        onPress={() =>
          onBuscar({
            filial,
            qtd: parseInt(qtd),
            pdv,
            cliente,
            cupom,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
  clienteItem: {
    padding: 8,
    backgroundColor: '#eee',
    marginBottom: 4,
    borderRadius: 4,
  },
});
