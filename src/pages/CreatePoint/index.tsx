import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { TileLayer, Marker, Map } from 'react-leaflet'
import api from '../../services/api'
import axios from 'axios'
import { LeafletMouseEvent } from 'leaflet'

import Dropzone from '../../components/Dropzone'

import './styles.css'

import logo from '../../assets/logo.svg'

interface Item{
    id: number;
    titulo: string;
    url_imagem: string;
}

interface IBGEUFResponse{
    id: number;
    sigla: string;
    nome: string;
}

interface IBGECidadeResponse{
    nome: string;
}

const CreatePoint = () => {

    /* ATENSSAU 
    Sempre que criar um estado para um array ou objeto, é necessário manualmente informar
    o tipo da variável que vai ser armazenada ali dentro. 
    Para isso, crio uma interface (acima) e implemento na função useState o generic com a interface
    */
    const [items, setItems] = useState<Item[]>([]); // um estado, +- global var. Importante ser declarada right after component! 
    const [ufs, setUfs] = useState<string[]>([]); // veio de um obj. IBGEUFResponse, mas dps de filtrar é só um array de strings
    const [cidades, setCidades] = useState<string[]>([]);

    const [coordenadaInicial, setCoordenadaInicial] = useState<[number, number]>([0,0]);

    const [dadosFormulario, setDadosFormulario] = useState({
        nome: '',
        email: '',
        nagazap: '',
    });
    
    const [ufSelecionada, setUfSelecionada] = useState('0');
    const [cidadeSelecionada, setCidadeSelecionada] = useState('0');
    const [coordenadaSelecionada, setCoordenadaSelecionada] = useState<[number, number]>([0,0]);
    const [itensSelecionados, setItensSelecionados] = useState<number[]>([]);
    const [arquivoSelecionado, setArquivoSelecionado] = useState<File>();

    const history = useHistory();

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            setCoordenadaInicial([latitude, longitude]);
        });
    }, []);
    useEffect(() => {
        api.get('itens')
            .then(response => {
                setItems(response.data); // response só existe dentro dessa função. "variáveis globais" nesse caso são estados.
            })
    }, [])  /* conceito de Estado do JS: o colchetes recebe o gatilho para atualizar o estado do useEffect.
            Vazio significa que independente de qqr alteração no componente CreatePoint,
            o q tá dentro das chaves vai ser carregado uma única vez, assim q a página for carregada.
            */
    useEffect(() => {
    axios.get<IBGEUFResponse[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
        .then(response => {
            const siglas = response.data.map(uf => uf.sigla); // meio que filtrei a response, só me interessam as siglas
            setUfs(siglas);
        })
    }, [])
    useEffect(() => {
        // carregar as cidades sempre que a UF muda
        if (ufSelecionada === '0'){
            return;
        }
        
        axios
            .get<IBGEUFResponse[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufSelecionada}/municipios`)
            .then(response => {
                const cidades = response.data.map(c => c.nome); // meio que filtrei a response, só me interessam as siglas
                setCidades(cidades);
            })
    }, [ufSelecionada])

    function guardaUFSelecionado(evento: ChangeEvent<HTMLSelectElement>){
        const ufSelecionada = evento.target.value;

        setUfSelecionada(ufSelecionada);
    }
    function guardaCidadeSelecionada(evento: ChangeEvent<HTMLSelectElement>){
        const cidadeSelecionada = evento.target.value;

        setCidadeSelecionada(cidadeSelecionada);
    }
    function guardaCoordenadasDoMapa(evento: LeafletMouseEvent){    
        setCoordenadaSelecionada([
            evento.latlng.lat,
            evento.latlng.lng
        ]);
    }
    function guardaValorInseridoEmCampo(evento: ChangeEvent<HTMLInputElement>){
        const {name, value} = evento.target;

        setDadosFormulario({ ...dadosFormulario, [name]: value });
    }
    function guardaItemSelecionado(id: number){
        // lógica para selecionar/desselecionar os botões de itens
        const jaEstaSelecionado = itensSelecionados.findIndex(item => item === id);

        if(jaEstaSelecionado >= 0){
            const filteredItems = itensSelecionados.filter(item => item !== id);
            setItensSelecionados(filteredItems);
        } else {
            setItensSelecionados([...itensSelecionados, id]);
        }
    }
    async function submeteFormulario(evento: FormEvent){
        evento.preventDefault();

        const { nome, email, nagazap } = dadosFormulario;
        const estado = ufSelecionada;
        const cidade = cidadeSelecionada;
        const [latitude, longitude] = coordenadaSelecionada;
        const itens = itensSelecionados;
        
        const corpoDaRequisição = new FormData();   // essa classe aceita o multipart/form-data formato de requisição (ñ é mais JSON)

        corpoDaRequisição.append('nome',nome);
        corpoDaRequisição.append('email',email);
        corpoDaRequisição.append('nagazap',nagazap);
        corpoDaRequisição.append('unidade_federativa', estado);
        corpoDaRequisição.append('cidade',cidade);
        corpoDaRequisição.append('latitude',String(latitude));
        corpoDaRequisição.append('longitude',String(longitude));
        corpoDaRequisição.append('itens',itens.join(','));
        corpoDaRequisição.append('rua',"     ");
        corpoDaRequisição.append('numero', '0');

        if(arquivoSelecionado){
            corpoDaRequisição.append('imagem',arquivoSelecionado);
        }

        // const corpoDaRequisição = {
        //     // ATENCAO POIS AQUI MONTA O JSON Q TEM Q TER O NOME DOS CAMPOS EXATAMENTE IGUAL AO QUE A API ESPERA
        //     nome,
        //     email,
        //     nagazap,
        //     unidade_federativa: estado,
        //     cidade,
        //     latitude,
        //     longitude,
        //     itens,
        //     rua: "     ",
	    //     numero: "0",
        // }

        await api.post('pontos',corpoDaRequisição);

        alert("Ponto de coleta criado! (mas ñ tenho ctz eita)")

        history.push('/');
    }

    return(
        <div id="page-create-point">
            <header>
                <img src={logo} alt="Ecoleta"/>

                <Link to="/">
                    Voltar para home
                    <FiArrowLeft />
                </Link>
            </header>

            <form onSubmit={submeteFormulario}>
                <h1>Cadastro do <br></br> ponto de coleta</h1>

                <Dropzone onFileUpload={setArquivoSelecionado}/>

                <fieldset>
                    <legend>
                        <h2>Dados</h2>
                    </legend>

                    <div className="field">
                        <label htmlFor="nome">Nome da entidade</label>
                        <input
                            type="text"
                            name="nome"
                            id="nome"
                            onChange={guardaValorInseridoEmCampo}    
                        />
                    </div>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="email">E-mail</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                onChange={guardaValorInseridoEmCampo}  
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="nagazap">Nagazap</label>
                            <input
                                type="text"
                                name="nagazap"
                                id="nagazap"
                                onChange={guardaValorInseridoEmCampo}  
                            />
                        </div>
                    </div>
                </fieldset>
                  
                <fieldset>
                    <legend>
                        <h2>Endereço</h2>
                        <span>Selecione o endereço no mapa</span>
                    </legend>

                    <Map center={coordenadaInicial} zoom={15} onClick={guardaCoordenadasDoMapa}>
                        <TileLayer
                            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={coordenadaSelecionada}/>
                    </Map>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="uf">Estado (UF)</label>
                            <select 
                                name="uf"
                                id="uf" 
                                value={ufSelecionada} 
                                onChange={guardaUFSelecionado}
                            >
                                <option value="0">Selecione uma UF</option>
                                {ufs.map(sigla => (
                                    <option key={sigla} value={sigla}>{sigla}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="city">Cidade</label>
                            <select
                                name="city"
                                id="city"
                                value={cidadeSelecionada}
                                onChange={guardaCidadeSelecionada}
                            >
                                <option value="0">Selecione uma cidade</option>
                                {cidades.map(cidade => (
                                    <option key={cidade} value={cidade}>{cidade}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>
                        <h2>Itens de coleta</h2>
                        <span>Selecione um ou mais itens abaixo</span>
                    </legend>

                    <ul className="items-grid">
                        {items.map(item => (
                            <li
                                key={item.id}
                                onClick={() => guardaItemSelecionado(item.id)} /*Each child in a list should have a unique "key" prop.*/
                                className={itensSelecionados.includes(item.id) ? 'selected' : ''}
                            >  
                                <img src={item.url_imagem} alt={item.titulo}/>
                                <span>{item.titulo}</span>
                            </li>
                        ))}
                    </ul>

                </fieldset>

                <button type="submit">
                    Cadastrar ponto de coleta
                </button>
            </form>
        </div>
    )
}

export default CreatePoint;