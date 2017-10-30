import os
from io import StringIO

import attr
import pycortex.graph
from attr import Factory
from flask import Flask, render_template, redirect
from flask_bootstrap import Bootstrap
from subprocess import check_output

from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired


def create_app():
    app = Flask(__name__)
    Bootstrap(app)

    return app


app = create_app()

CORTEXJDK_JAR = 'libs/CortexJDK/dist/cortexjdk.jar'
GRAPH = os.environ.get('CORTEX_GRAPH', 'data/test.ctx')
app.config.from_object(__name__)


@attr.s
class Kmer(object):
    line = attr.ib()
    canonical_kmer = attr.ib(init=False)
    oriented_kmer = attr.ib(init=False)
    coverage = attr.ib(init=False)
    _edge_split = attr.ib(init=False)
    edges = attr.ib(init=False)
    forward_links = attr.ib(default=Factory(dict))
    backward_links = attr.ib(default=Factory(dict))

    def __attrs_post_init__(self):
        fields = self.line.strip().split()
        self.canonical_kmer, self.oriented_kmer, self.coverage, self._edge_split = tuple(fields[:4])
        self.edges = list(self._edge_split)
        assert (len(self.edges) == 8)


@attr.s
class KmerContainer(object):
    kmers = attr.ib()
    contig = attr.ib(init=False)

    def __attrs_post_init__(self):
        assert len(self.kmers) > 0

        self.contig = ''.join(
            [self.kmers[0].oriented_kmer] + [kmer.oriented_kmer[-1] for kmer in self.kmers[1:]])

    def backward_links(self):
        edges = dict()
        for edge in self.kmers[0].edges[:4]:
            if edge != '.':
                edges[edge] = edge + self.contig
        return edges

    def forward_links(self):
        edges = dict()
        for edge in self.kmers[-1].edges[4:]:
            if edge != '.':
                edges[edge] = (self.contig + edge).upper()
        return edges


class MyForm(FlaskForm):
    name = StringField(validators=[DataRequired()])
    submit = SubmitField()


@app.route('/', methods=('GET', 'POST'))
def index():
    form = MyForm(csrf_enabled=False)
    if form.validate_on_submit():
        return redirect('/kmers/' + form.name.raw_data[0])
    return render_template('index.html', form=form)


def parse_cortexjdk_print(stream):
    kmers = []
    for line in stream:
        if line.startswith('I'):
            continue
        kmers.append(Kmer(line))
    return kmers


@app.route('/view/<contig>')
def contig_show(contig):
    with open(GRAPH, 'rb') as graph_handle:
        contig_retriever = pycortex.graph.ContigRetriever(graph_handle)
        serializer = pycortex.graph.serializer.Serializer(contig_retriever.get_kmer_graph(contig))
        raise NotImplementedError


@app.route('/kmers/<kmer>')
def kmers_show(kmer):
    kmer = kmer.upper()
    output = StringIO(
        check_output(['java', '-jar', CORTEXJDK_JAR, 'Print', '--graph', GRAPH, '--record',
                      kmer]).decode())
    kmers = parse_cortexjdk_print(output)
    kmer_container = KmerContainer(kmers)
    return render_template('kmers.html', kmer_container=kmer_container,
                           backward_links=kmer_container.backward_links(),
                           forward_links=kmer_container.forward_links())
